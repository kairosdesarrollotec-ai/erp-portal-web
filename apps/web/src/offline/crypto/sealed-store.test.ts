import 'fake-indexeddb/auto';
import { Blob as NodeBlob } from 'node:buffer';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { kairosDb } from '../database/kairos-db';
import { cryptoKeyDb, discardUserCryptoKeys, KEY_ROTATION_INTERVAL_MS } from './local-encryption';
import { LocalCryptoUnavailableError, setLocalCryptoUserIdProvider } from './local-user';
import { purgeLocalSensitiveData, sealLegacyLocalData } from './sealed-store';
import { enqueueAttendance, getAttendanceQueue, type EnqueueAttendanceInput } from '../queue/attendance-queue';
import { addEvidenceToQueue, getPendingEvidence } from '../queue/evidence-upload-queue';
import { getUnsentFieldEdits, saveFieldEdit } from '../queue/sync-draft-store';

/**
 * SDD-00 §17.4 (`sdd-00-transversal.md` ~632): lo que se guarda sin conexion en IndexedDB va cifrado (AES-256-GCM).
 * Estas pruebas leen las filas CRUDAS de Dexie para demostrar que no queda texto plano de datos sensibles.
 */
const USER = 'usr-sealed-1';
const SECRET_NOTE = 'nota-sensible-de-asistencia';
const PHOTO_TEXT = 'bytes-de-foto-de-asistencia';

const attendanceInput: EnqueueAttendanceInput = {
  employeeId: 'emp-1',
  companyId: 'comp-1',
  branchId: 'br-1',
  type: 'CHECK_IN',
  status: 'PRESENTE',
  date: '2026-10-27',
  capturedAt: '2026-10-27T09:55:00.000Z',
  latitude: -12.0464,
  longitude: -77.0428,
  accuracy: 5,
  notes: SECRET_NOTE,
  photoBlob: new Blob([PHOTO_TEXT], { type: 'image/jpeg' }),
  photoMimeType: 'image/jpeg',
};

async function readBlobText(blob: Blob): Promise<string> {
  return blob.text();
}

describe('Cifrado de almacenes locales (SDD-00 §17.4)', () => {
  beforeEach(async () => {
    setLocalCryptoUserIdProvider(() => USER);
    await cryptoKeyDb.open();
    await cryptoKeyDb.crypto_keys.clear();
    await kairosDb.open();
    await purgeLocalSensitiveData();
  });

  afterAll(() => {
    setLocalCryptoUserIdProvider(() => 'test-user');
  });

  it('asistencia: la fila cruda no tiene ubicación, notas ni foto en claro y se lee de vuelta', async () => {
    const queued = await enqueueAttendance(attendanceInput);

    const raw = (await kairosDb.attendance_queue.get(queued.id!))!;
    expect(raw.sealed?._encrypted).toBe(true);
    expect(raw.photoSealed?._encryptedBlob).toBe(true);
    expect(raw.latitude).toBeUndefined();
    expect(raw.longitude).toBeUndefined();
    expect(raw.notes).toBeUndefined();
    expect(raw.photoBlob).toBeUndefined();
    expect(JSON.stringify(raw.sealed)).not.toContain(SECRET_NOTE);
    // metadatos de estado/indice siguen en claro
    expect(raw.employeeId).toBe('emp-1');
    expect(raw.queueStatus).toBe('pending');

    const [read] = await getAttendanceQueue('emp-1');
    expect(read.latitude).toBeCloseTo(-12.0464);
    expect(read.notes).toBe(SECRET_NOTE);
    expect(await readBlobText(read.photoBlob!)).toBe(PHOTO_TEXT);
  });

  it('evidencia: el archivo se guarda cifrado (sin `blob` en claro) y se descifra al leer', async () => {
    await addEvidenceToQueue({
      rentalId: 'rent-1',
      returnId: null,
      type: 'PHOTO',
      zone: 'FRENTE',
      mimeType: 'image/jpeg',
      blob: new Blob(['foto-evidencia'], { type: 'image/jpeg' }),
    });

    const [raw] = await kairosDb.evidence_queue.toArray();
    expect(raw.blob).toBeUndefined();
    expect(raw.blobSealed?._encryptedBlob).toBe(true);
    expect(raw.contentHash).toMatch(/^[0-9a-f]{64}$/); // hash calculado sobre el contenido en claro

    const [read] = await getPendingEvidence('rent-1');
    expect(await readBlobText(read.blob)).toBe('foto-evidencia');
  });

  it('ediciones de checklist: el valor va cifrado y se recupera; PAYMENT sigue prohibido offline', async () => {
    await saveFieldEdit('ENTREGA', 'rent-9', { key: 'obs', value: 'rayón en puerta derecha' });

    const [raw] = await kairosDb.sync_field_edits.toArray();
    expect(raw.value).toBeUndefined();
    expect(raw.valueSealed?._encrypted).toBe(true);
    expect(JSON.stringify(raw.valueSealed)).not.toContain('rayón');

    const unsent = await getUnsentFieldEdits('ENTREGA', 'rent-9');
    expect(unsent).toHaveLength(1);
    expect(unsent[0].value).toBe('rayón en puerta derecha');

    await expect(saveFieldEdit('ENTREGA', 'rent-9', { key: 'pago', value: 100, dataType: 'PAYMENT' })).rejects.toThrow(
      /exclusivamente online/,
    );
  });

  it('sin sesión autenticada no se guarda nada sensible', async () => {
    setLocalCryptoUserIdProvider(() => null);
    await expect(enqueueAttendance(attendanceInput)).rejects.toBeInstanceOf(LocalCryptoUnavailableError);
    expect(await kairosDb.attendance_queue.count()).toBe(0);
  });

  it('si se pierde la clave, la fila es ilegible: se omite en vez de exponer o romper la pantalla', async () => {
    await enqueueAttendance(attendanceInput);
    await discardUserCryptoKeys(USER);
    expect(await getAttendanceQueue('emp-1')).toEqual([]);
  });

  it('rotación a 90 días: lo cifrado con la clave v1 sigue legible tras rotar a v2', async () => {
    const first = await enqueueAttendance(attendanceInput);
    const rawV1 = (await kairosDb.attendance_queue.get(first.id!))!;
    expect(rawV1.sealed?.keyVersion).toBe(1);

    const key1 = await cryptoKeyDb.crypto_keys.get(`${USER}:v1`);
    await cryptoKeyDb.crypto_keys.update(key1!.keyId, { createdAt: Date.now() - KEY_ROTATION_INTERVAL_MS - 86_400_000 });

    await enqueueAttendance({ ...attendanceInput, employeeId: 'emp-2' });
    const rawV2 = (await kairosDb.attendance_queue.where('employeeId').equals('emp-2').first())!;
    expect(rawV2.sealed?.keyVersion).toBe(2);

    const readOld = await getAttendanceQueue('emp-1');
    expect(readOld[0].notes).toBe(SECRET_NOTE);
  });

  it('migración: filas heredadas en texto plano se cifran y el plano desaparece (idempotente)', async () => {
    const attId = await kairosDb.attendance_queue.add({
      employeeId: 'emp-old',
      companyId: 'c',
      branchId: 'b',
      type: 'CHECK_IN',
      status: 'PRESENTE',
      date: '2026-10-27',
      capturedAt: '2026-10-27T08:00:00.000Z',
      latitude: -12,
      longitude: -77,
      accuracy: 3,
      notes: 'plano heredado',
      queueStatus: 'pending',
      createdAt: Date.now(),
    });
    const evId = await kairosDb.evidence_queue.add({
      rentalId: 'rent-old',
      returnId: null,
      type: 'PHOTO',
      zone: 'FRENTE',
      mimeType: 'image/jpeg',
      // Blob de Node: el Blob de jsdom no sobrevive a structuredClone dentro de fake-indexeddb.
      blob: new NodeBlob(['foto-vieja'], { type: 'image/jpeg' }) as unknown as Blob,
      status: 'pending',
      createdAt: Date.now(),
    });
    await kairosDb.sync_field_edits.put({
      checklistType: 'ENTREGA',
      sourceId: 'rent-old',
      key: 'k',
      value: 'valor viejo',
      baseRev: 0,
      editedAt: new Date().toISOString(),
    });

    const result = await sealLegacyLocalData();
    expect(result).toEqual({ evidence: 1, fieldEdits: 1, attendance: 1 });

    const att = (await kairosDb.attendance_queue.get(attId))!;
    expect(att.notes).toBeUndefined();
    expect(att.latitude).toBeUndefined();
    expect(att.sealed?._encrypted).toBe(true);
    const ev = (await kairosDb.evidence_queue.get(evId))!;
    expect(ev.blob).toBeUndefined();
    expect(ev.blobSealed?._encryptedBlob).toBe(true);
    const [edit] = await kairosDb.sync_field_edits.toArray();
    expect(edit.value).toBeUndefined();
    expect(edit.valueSealed?._encrypted).toBe(true);

    expect((await getAttendanceQueue('emp-old'))[0].notes).toBe('plano heredado');
    expect(await sealLegacyLocalData()).toEqual({ evidence: 0, fieldEdits: 0, attendance: 0 });
  });

  it('migración sin sesión no hace nada (la clave solo existe tras autenticar)', async () => {
    setLocalCryptoUserIdProvider(() => null);
    expect(await sealLegacyLocalData()).toEqual({ evidence: 0, fieldEdits: 0, attendance: 0 });
  });

  it('purga: cierre de sesión borra todos los almacenes locales', async () => {
    await enqueueAttendance(attendanceInput);
    await saveFieldEdit('ENTREGA', 'rent-9', { key: 'obs', value: 'x' });
    await purgeLocalSensitiveData();
    expect(await kairosDb.attendance_queue.count()).toBe(0);
    expect(await kairosDb.sync_field_edits.count()).toBe(0);
    expect(await kairosDb.sync_drafts.count()).toBe(0);
    expect(await kairosDb.evidence_queue.count()).toBe(0);
  });

  it('guardia: ningún módulo de cola escribe en un almacén sensible sin pasar por la capa de cifrado', () => {
    const dir = join(__dirname, '..', 'queue');
    const files = readdirSync(dir).filter((f) => f.endsWith('.ts') && !f.includes('.test.'));
    const writes = /kairosDb\.(evidence_queue|attendance_queue|sync_field_edits)\.(add|put)\(/g;
    for (const file of files) {
      const source = readFileSync(join(dir, file), 'utf8');
      for (const match of source.matchAll(writes)) {
        const window = source.slice(match.index, match.index + 160);
        expect(window, `${file}: escritura sin sellar → ${match[0]}`).toMatch(/seal(Evidence|Attendance|FieldEdit)Row/);
      }
    }
  });
});
