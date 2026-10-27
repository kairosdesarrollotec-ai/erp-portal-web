import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { kairosDb } from '../database/kairos-db';
import {
  enqueueAttendance,
  getAttendanceQueue,
  getTodayQueuedAttendance,
  syncAttendanceQueue,
  syncSingleAttendanceItem,
  type EnqueueAttendanceInput,
} from './attendance-queue';

describe('Offline Attendance Queue (P6)', () => {
  const employeeId = 'emp-101';
  const companyId = 'comp-1';
  const branchId = 'branch-1';
  const date = '2026-10-27';
  const now = new Date('2026-10-27T10:00:00.000Z');

  const baseInput: EnqueueAttendanceInput = {
    employeeId,
    companyId,
    branchId,
    type: 'CHECK_IN',
    status: 'PRESENTE',
    date,
    capturedAt: '2026-10-27T09:55:00.000Z',
    latitude: -12.0464,
    longitude: -77.0428,
    accuracy: 5,
    photoBlob: new Blob(['fake-photo'], { type: 'image/jpeg' }),
    photoMimeType: 'image/jpeg',
  };

  beforeEach(async () => {
    await kairosDb.open();
    await kairosDb.attendance_queue.clear();
  });

  it('encolar sin señal: guarda localmente con estado pending y campos completos', async () => {
    const item = await enqueueAttendance(baseInput);

    expect(item.id).toBeDefined();
    expect(item.queueStatus).toBe('pending');
    expect(item.employeeId).toBe(employeeId);
    expect(item.capturedAt).toBe(baseInput.capturedAt);
    expect(item.date).toBe(date);

    const saved = await getAttendanceQueue(employeeId);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe(item.id);
  });

  it('bloquear segunda marca del día: no permite encolar dos marcas para la misma fecha y colaborador', async () => {
    await enqueueAttendance(baseInput);

    await expect(enqueueAttendance(baseInput)).rejects.toThrow(
      'Ya existe una marca registrada o en cola para hoy.',
    );

    const count = await kairosDb.attendance_queue.count();
    expect(count).toBe(1);
  });

  it('sincronizar al volver: sube evidencia, llama logAttendance y marca synced', async () => {
    const item = await enqueueAttendance(baseInput);

    const uploadEvidence = vi.fn().mockResolvedValue({ storageRef: 'companies/comp-1/foto.jpg' });
    const logAttendance = vi.fn().mockResolvedValue({ ok: true, requiresReview: false });

    const synced = await syncSingleAttendanceItem(item, {
      idToken: 'token-123',
      uploadEvidence,
      logAttendance,
      now: () => now,
    });

    expect(synced.queueStatus).toBe('synced');
    expect(synced.syncedAt).toBe(now.toISOString());
    expect(uploadEvidence).toHaveBeenCalledWith('token-123', employeeId, expect.any(File));
    expect(logAttendance).toHaveBeenCalledWith(
      'token-123',
      { companyId, branchId },
      expect.objectContaining({
        type: 'CHECK_IN',
        status: 'PRESENTE',
        capturedAt: baseInput.capturedAt,
        evidence: { kind: 'SELF_PHOTO', storageRef: 'companies/comp-1/foto.jpg' },
      }),
    );

    const fromDb = await getTodayQueuedAttendance(employeeId, date);
    expect(fromDb?.queueStatus).toBe('synced');
  });

  it('no duplicar: ignora ítems que ya están en syncing o synced', async () => {
    const item = await enqueueAttendance(baseInput);
    await kairosDb.attendance_queue.update(item.id!, { queueStatus: 'synced' });

    const uploadEvidence = vi.fn();
    const logAttendance = vi.fn();

    const [updated] = (await getAttendanceQueue(employeeId)).filter((i) => i.id === item.id);
    const res = await syncSingleAttendanceItem(updated!, {
      idToken: 'token-123',
      uploadEvidence,
      logAttendance,
    });

    expect(res.queueStatus).toBe('synced');
    expect(uploadEvidence).not.toHaveBeenCalled();
    expect(logAttendance).not.toHaveBeenCalled();
  });

  it('error con motivo: si el backend falla, guarda error y mensaje explicativo', async () => {
    const item = await enqueueAttendance(baseInput);

    const uploadEvidence = vi.fn().mockResolvedValue({ storageRef: 'companies/comp-1/foto.jpg' });
    const logAttendance = vi.fn().mockRejectedValue(new Error('Ubicación fuera de rango permitido'));

    const errored = await syncSingleAttendanceItem(item, {
      idToken: 'token-123',
      uploadEvidence,
      logAttendance,
      now: () => now,
    });

    expect(errored.queueStatus).toBe('error');
    expect(errored.errorMessage).toBe('Ubicación fuera de rango permitido');

    const fromDb = await getTodayQueuedAttendance(employeeId, date);
    expect(fromDb?.queueStatus).toBe('error');
    expect(fromDb?.errorMessage).toBe('Ubicación fuera de rango permitido');
  });

  it('descarte al vencer el tope: si la marca supera 24 h de antigüedad, pasa a expired', async () => {
    // 25 horas después de la captura
    const capturedTime = new Date('2026-10-26T08:00:00.000Z');
    const laterTime = new Date(capturedTime.getTime() + 25 * 60 * 60 * 1000);

    const item = await enqueueAttendance({
      ...baseInput,
      capturedAt: capturedTime.toISOString(),
    });

    const uploadEvidence = vi.fn();
    const logAttendance = vi.fn();

    const expired = await syncSingleAttendanceItem(item, {
      idToken: 'token-123',
      uploadEvidence,
      logAttendance,
      now: () => laterTime,
    });

    expect(expired.queueStatus).toBe('expired');
    expect(expired.errorMessage).toContain('24 horas');
    expect(uploadEvidence).not.toHaveBeenCalled();
    expect(logAttendance).not.toHaveBeenCalled();

    const fromDb = await getTodayQueuedAttendance(employeeId, date);
    expect(fromDb?.queueStatus).toBe('expired');
  });

  it('syncAttendanceQueue sincroniza todos los ítems pendientes en lote', async () => {
    await enqueueAttendance(baseInput);

    const uploadEvidence = vi.fn().mockResolvedValue({ storageRef: 'companies/comp-1/foto.jpg' });
    const logAttendance = vi.fn().mockResolvedValue({ ok: true });

    const summary = await syncAttendanceQueue({
      idToken: 'token-123',
      employeeId,
      uploadEvidence,
      logAttendance,
      now: () => now,
    });

    expect(summary.syncedCount).toBe(1);
    expect(summary.errorCount).toBe(0);
    expect(summary.expiredCount).toBe(0);
  });
});
