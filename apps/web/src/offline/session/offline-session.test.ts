import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cryptoKeyDb } from '../crypto/local-encryption';
import { setLocalCryptoUserIdProvider } from '../crypto/local-user';
import { SESSION_DURATION_MS } from '../../app/shared/session-time';
import { isOfflineAllowedPath } from './offline-mode';
import {
  __resetOfflineSessionQueueForTests,
  clearOfflineSession,
  isNetworkFailure,
  isSessionRevoked,
  isSnapshotFresh,
  markSessionVerified,
  readOfflineSnapshot,
  recallContext,
  recallPermissions,
  recallResource,
  rememberContext,
  rememberPermissions,
  rememberResource,
} from './offline-session';

const USER = 'usr-offline-1';
const CONTEXT = { companyId: 'c1', companyName: 'VeloxRent', branchId: 'b1', branchName: 'Casa Central' };

describe('V-27 · clasificación de errores', () => {
  it('un fallo de red (TypeError / sin respuesta) es de red; una respuesta HTTP no', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFailure({ code: 'auth/network-request-failed' })).toBe(true);
    expect(isNetworkFailure({ status: 503 })).toBe(false);
    expect(isNetworkFailure({ status: 401 })).toBe(false);
    expect(isNetworkFailure(null)).toBe(false);
  });

  it('sin conexión del navegador un error sin respuesta cuenta como de red', () => {
    const spy = vi.spyOn(window.navigator, 'onLine', 'get').mockReturnValue(false);
    expect(isNetworkFailure(new Error('Sesion no disponible'))).toBe(true);
    spy.mockRestore();
  });

  it('401/403 y tokens revocados son sesión revocada; un fallo de red o un 5xx no', () => {
    expect(isSessionRevoked({ status: 401 })).toBe(true);
    expect(isSessionRevoked({ status: 403 })).toBe(true);
    expect(isSessionRevoked({ code: 'auth/user-disabled' })).toBe(true);
    expect(isSessionRevoked({ status: 503 })).toBe(false);
    expect(isSessionRevoked(new TypeError('Failed to fetch'))).toBe(false);
  });
});

describe('V-27 · rutas permitidas sin conexión (SDD-TRANSVERSAL §17.1)', () => {
  it('solo los 2 checklists y Sincronización', () => {
    expect(isOfflineAllowedPath('/devoluciones/abc/checklist')).toBe(true);
    expect(isOfflineAllowedPath('/alquileres/abc/entrega-04')).toBe(true);
    expect(isOfflineAllowedPath('/sincronizacion')).toBe(true);
    expect(isOfflineAllowedPath('/alquileres/abc/entrega-02')).toBe(false);
    expect(isOfflineAllowedPath('/alquileres/abc/entrega-05')).toBe(false);
    expect(isOfflineAllowedPath('/devoluciones/abc/cierre')).toBe(false);
    expect(isOfflineAllowedPath('/pagos/garantias')).toBe(false);
    expect(isOfflineAllowedPath('/tablero')).toBe(false);
  });
});

describe('V-27 · snapshot cifrado de la sesión offline (8 h)', () => {
  beforeEach(async () => {
    setLocalCryptoUserIdProvider(() => USER);
    await cryptoKeyDb.open();
    await cryptoKeyDb.crypto_keys.clear();
    clearOfflineSession();
    __resetOfflineSessionQueueForTests();
  });

  afterEach(() => {
    vi.useRealTimers();
    setLocalCryptoUserIdProvider(null);
  });

  it('sin verificación previa del servidor no hay sesión offline', async () => {
    expect(await readOfflineSnapshot()).toBeNull();
    await rememberContext(CONTEXT);
    // guardar contexto sin verificar la cuenta NO habilita el modo offline
    expect(await readOfflineSnapshot()).toBeNull();
  });

  it('tras verificar la cuenta guarda y recupera contexto, permisos y expediente', async () => {
    await markSessionVerified();
    await rememberContext(CONTEXT);
    await rememberPermissions({ contextKey: 'c1:b1', granted: ['RETURN.UPLOAD_EVIDENCE'], matrixVersion: 3, role: null });
    await rememberResource('return:r1', { id: 'r1', branchId: 'b1' });

    expect(await recallContext()).toEqual(CONTEXT);
    expect((await recallPermissions('c1:b1'))?.granted).toEqual(['RETURN.UPLOAD_EVIDENCE']);
    expect(await recallPermissions('otro:ctx')).toBeNull();
    expect(await recallResource('return:r1')).toEqual({ id: 'r1', branchId: 'b1' });
    expect(await recallResource('return:otro')).toBeNull();
  });

  it('no deja datos en texto plano en localStorage', async () => {
    await markSessionVerified();
    await rememberContext(CONTEXT);
    await rememberResource('return:r1', { customerName: 'QA Cliente Secreto' });
    const raw = window.localStorage.getItem('kairos.offline-session.v1') ?? '';
    expect(raw).not.toContain('QA Cliente Secreto');
    expect(raw).not.toContain('VeloxRent');
    expect(raw).toContain('_encrypted');
  });

  it('vence a las 8 h: se descarta y se borra', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-30T08:00:00Z'));
    await markSessionVerified();
    await rememberContext(CONTEXT);
    expect(await readOfflineSnapshot()).not.toBeNull();

    vi.setSystemTime(new Date(Date.now() + SESSION_DURATION_MS + 1000));
    expect(await readOfflineSnapshot()).toBeNull();
    expect(window.localStorage.getItem('kairos.offline-session.v1')).toBeNull();
  });

  it('isSnapshotFresh respeta el límite de 8 h', () => {
    const now = 1_000_000_000;
    expect(isSnapshotFresh({ verifiedAt: now - 1000, resources: {} }, now)).toBe(true);
    expect(isSnapshotFresh({ verifiedAt: now - SESSION_DURATION_MS, resources: {} }, now)).toBe(false);
    expect(isSnapshotFresh({ verifiedAt: 0, resources: {} }, now)).toBe(false);
  });

  it('otro usuario en el mismo dispositivo no puede leerlo', async () => {
    await markSessionVerified();
    await rememberContext(CONTEXT);
    setLocalCryptoUserIdProvider(() => 'usr-otro');
    expect(await readOfflineSnapshot()).toBeNull();
  });

  it('clearOfflineSession lo elimina (cierre de sesión / revocación)', async () => {
    await markSessionVerified();
    clearOfflineSession();
    expect(await readOfflineSnapshot()).toBeNull();
  });

  it('conserva como máximo 5 expedientes (los más recientes)', async () => {
    await markSessionVerified();
    for (let i = 0; i < 7; i++) {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(Date.now() + 1000));
      await rememberResource(`return:${i}`, { i });
    }
    expect(await recallResource('return:0')).toBeNull();
    expect(await recallResource('return:6')).toEqual({ i: 6 });
  });
});
