import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const postMock = vi.fn();
vi.mock('../../api/transversal-api-client', () => ({
  transversalApiClient: { POST: (...args: unknown[]) => postMock(...args) },
}));

import { recordLoginAttempt } from './audit-client';

describe('recordLoginAttempt (TR-01, auditoría de intentos de login)', () => {
  beforeEach(() => {
    postMock.mockReset();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('envía correo, resultado y motivo a POST /audit/login-attempts (nunca la contraseña)', async () => {
    postMock.mockResolvedValue({});
    await recordLoginAttempt('user@veloxrent.pe', 'FAILURE', 'auth/invalid-credential');
    expect(postMock).toHaveBeenCalledWith(
      '/audit/login-attempts',
      expect.objectContaining({ body: { email: 'user@veloxrent.pe', outcome: 'FAILURE', reason: 'auth/invalid-credential' } }),
    );
  });

  it('no lanza si el backend falla', async () => {
    postMock.mockRejectedValue(new Error('offline'));
    await expect(recordLoginAttempt('user@veloxrent.pe', 'SUCCESS', null)).resolves.toBeUndefined();
  });

  it('corta la petición con un timeout corto (3 s) si el backend no responde', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    postMock.mockImplementation((_path: string, init: { signal: AbortSignal }) => {
      signal = init.signal;
      return new Promise((_resolve, reject) => init.signal.addEventListener('abort', () => reject(new Error('abort'))));
    });
    const pending = recordLoginAttempt('user@veloxrent.pe', 'SUCCESS', null);
    await vi.advanceTimersByTimeAsync(3000);
    await pending;
    expect(signal?.aborted).toBe(true);
  });

  it('no envía nada si no hay un correo con forma válida (evita un 400 inútil)', async () => {
    await recordLoginAttempt('unknown', 'FAILURE', 'mfa/unknown-error');
    expect(postMock).not.toHaveBeenCalled();
  });
});
