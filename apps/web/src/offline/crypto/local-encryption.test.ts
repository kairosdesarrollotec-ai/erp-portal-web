import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  assertOfflineAllowed,
  countPendingUnsyncedItems,
  cryptoKeyDb,
  decryptLocalBlob,
  decryptLocalPayload,
  discardUserCryptoKeys,
  encryptLocalBlob,
  encryptLocalPayload,
  getOrCreateActiveUserKey,
  KEY_ROTATION_INTERVAL_MS,
} from './local-encryption';
import { kairosDb } from '../database/kairos-db';

describe('Local Encryption for Offline Storage (SDD-00 §17.4 / §22.1.1)', () => {
  const userId = 'usr-test-101';

  beforeEach(async () => {
    await cryptoKeyDb.open();
    await cryptoKeyDb.crypto_keys.clear();
    await kairosDb.open();
    await kairosDb.evidence_queue.clear();
    await kairosDb.sync_field_edits.clear();
    await kairosDb.attendance_queue.clear();
  });

  it('genera una clave AES-256-GCM no exportable (extractable: false) por usuario', async () => {
    const stored = await getOrCreateActiveUserKey(userId);

    expect(stored.userId).toBe(userId);
    expect(stored.version).toBe(1);
    expect(stored.keyId).toBe(`${userId}:v1`);
    expect(stored.cryptoKey.algorithm.name).toBe('AES-GCM');
    // extractable: false para prevenir exfiltración de clave
    expect(stored.cryptoKey.extractable).toBe(false);
  });

  it('cifra y descifra objetos preservando tipos y contenido', async () => {
    const payload = {
      checklistType: 'RECEPCION',
      sourceId: 'ret-123',
      notes: 'Checklist sin novedades con cliente conforme',
      mileage: 45200,
      active: true,
    };

    const encrypted = await encryptLocalPayload(userId, payload);

    expect(encrypted._encrypted).toBe(true);
    expect(encrypted.keyVersion).toBe(1);
    expect(typeof encrypted.iv).toBe('string');
    expect(typeof encrypted.ciphertext).toBe('string');
    expect(encrypted.ciphertext).not.toContain('Checklist sin novedades');

    const decrypted = await decryptLocalPayload<typeof payload>(userId, encrypted);
    expect(decrypted).toEqual(payload);
  });

  it('genera IV aleatorio por registro: dos cifrados del mismo texto producen diferentes ciphertexts', async () => {
    const text = { message: 'Mismo contenido idéntico' };

    const enc1 = await encryptLocalPayload(userId, text);
    const enc2 = await encryptLocalPayload(userId, text);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    expect(await decryptLocalPayload(userId, enc1)).toEqual(text);
    expect(await decryptLocalPayload(userId, enc2)).toEqual(text);
  });

  it('cifra y descifra Blobs binarios (fotos/videos) conservando mimeType y contenido de bytes', async () => {
    const originalText = 'datos de foto simulada en bytes binarios';
    const blob = new Blob([originalText], { type: 'image/jpeg' });

    const encryptedBlobPayload = await encryptLocalBlob(userId, blob);

    expect(encryptedBlobPayload._encryptedBlob).toBe(true);
    expect(encryptedBlobPayload.keyVersion).toBe(1);
    expect(encryptedBlobPayload.mimeType).toBe('image/jpeg');

    const decryptedBlob = await decryptLocalBlob(userId, encryptedBlobPayload);
    expect(decryptedBlob.type).toBe('image/jpeg');
    const decryptedText = await decryptedBlob.text();
    expect(decryptedText).toBe(originalText);
  });

  it('rotación periódica de 90 días: genera v2 si la clave supera KEY_ROTATION_INTERVAL_MS y descifra v1', async () => {
    const storedV1 = await getOrCreateActiveUserKey(userId);
    expect(storedV1.version).toBe(1);

    const oldData = { secret: 'Dato guardado con clave antigua v1' };
    const encryptedV1 = await encryptLocalPayload(userId, oldData);

    // Simular paso de 91 días
    const ninetyOneDays = KEY_ROTATION_INTERVAL_MS + 24 * 60 * 60 * 1000;
    await cryptoKeyDb.crypto_keys.update(storedV1.keyId, {
      createdAt: Date.now() - ninetyOneDays,
    });

    // Siguiente solicitud debe rotar a v2
    const storedV2 = await getOrCreateActiveUserKey(userId);
    expect(storedV2.version).toBe(2);
    expect(storedV2.keyId).toBe(`${userId}:v2`);

    // Nuevos datos se cifran con v2
    const newData = { secret: 'Dato guardado con clave v2' };
    const encryptedV2 = await encryptLocalPayload(userId, newData);
    expect(encryptedV2.keyVersion).toBe(2);

    // Ambos se pueden descifrar porque las claves históricas se conservan
    expect(await decryptLocalPayload(userId, encryptedV1)).toEqual(oldData);
    expect(await decryptLocalPayload(userId, encryptedV2)).toEqual(newData);
  });

  it('migración perezosa: los datos planos no cifrados se leen directamente sin fallar', async () => {
    const legacyPlainData = { legacy: true, name: 'Borrador antiguo pre-cifrado' };
    const result = await decryptLocalPayload(userId, legacyPlainData);
    expect(result).toEqual(legacyPlainData);

    const legacyBlob = new Blob(['foto sin cifrar'], { type: 'image/png' });
    const decryptedBlob = await decryptLocalBlob(userId, legacyBlob);
    expect(await decryptedBlob.text()).toBe('foto sin cifrar');
  });

  it('bloquea estrictamente datos altamente sensibles (PAYMENT) fuera de línea (SDD-00 §17.4)', async () => {
    expect(() => assertOfflineAllowed('PAYMENT')).toThrow(
      'Los datos de pago son exclusivamente online. Prohibido almacenar offline (SDD-00 §17.4).',
    );

    await expect(
      encryptLocalPayload(userId, { cardToken: 'xyz' }, 'PAYMENT'),
    ).rejects.toThrow('Los datos de pago son exclusivamente online');

    // Datos permitidos no lanzan error
    expect(() => assertOfflineAllowed('CHECKLIST')).not.toThrow();
    expect(() => assertOfflineAllowed('EMPLOYEE')).not.toThrow();
  });

  it('descarte seguro al cerrar sesión: purga las claves del usuario en IndexedDB', async () => {
    await getOrCreateActiveUserKey(userId);
    const storedBefore = await cryptoKeyDb.crypto_keys.where('userId').equals(userId).count();
    expect(storedBefore).toBeGreaterThan(0);

    await discardUserCryptoKeys(userId);

    const storedAfter = await cryptoKeyDb.crypto_keys.where('userId').equals(userId).count();
    expect(storedAfter).toBe(0);
  });

  it('cuenta elementos pendientes sin sincronizar en todas las colas de kairosDb antes de cerrar sesión', async () => {
    const emptyCount = await countPendingUnsyncedItems();
    expect(emptyCount).toEqual({ total: 0, evidence: 0, fieldEdits: 0, attendance: 0 });

    // Agregar un item pendiente a cada tabla
    await kairosDb.evidence_queue.add({
      rentalId: 'r-1',
      returnId: null,
      type: 'PHOTO',
      zone: 'FRONTAL',
      mimeType: 'image/jpeg',
      blob: new Blob(['x']),
      status: 'pending',
      createdAt: Date.now(),
    });

    await kairosDb.sync_field_edits.put({
      checklistType: 'RECEPCION',
      sourceId: 'ret-1',
      key: 'notes',
      value: 'Editado offline',
      baseRev: 1,
      editedAt: new Date().toISOString(),
      // sentAt no presente => pendiente
    });

    await kairosDb.attendance_queue.add({
      employeeId: 'emp-1',
      companyId: 'comp-1',
      branchId: 'branch-1',
      type: 'CHECK_IN',
      date: '2026-10-27',
      capturedAt: new Date().toISOString(),
      latitude: -12,
      longitude: -77,
      accuracy: 5,
      queueStatus: 'pending',
      createdAt: Date.now(),
    });

    const pending = await countPendingUnsyncedItems();
    expect(pending).toEqual({
      total: 3,
      evidence: 1,
      fieldEdits: 1,
      attendance: 1,
    });
  });
});
