import { describe, it, expect } from 'vitest';
import { formatDate, formatDateTime } from './flow-format';

describe('flow-format (hora de Lima)', () => {
  it('formatDate no desplaza una fecha sin hora y convierte instantes a Lima', () => {
    expect(formatDate('2026-10-15')).toBe('15/10/2026');
    expect(formatDate('2026-10-15T03:00:00Z')).toBe('14/10/2026');
  });

  it('formatDateTime muestra el instante en hora de Lima', () => {
    expect(formatDateTime('2026-10-15T03:00:00Z')).toBe('14/10/2026 22:00');
  });
});
