import { beforeEach, describe, expect, it } from 'vitest';
import { forgetWorkContext, recallWorkContext, rememberWorkContext } from './work-context-memory';
import type { WorkContextAssignment } from './work-context-client';

const a = (companyId: string, branchId: string) =>
  ({ companyId, companyName: companyId, branchId, branchName: branchId, role: { key: 'GERENCIA' } }) as unknown as WorkContextAssignment;

describe('work-context-memory', () => {
  beforeEach(() => sessionStorage.clear());

  it('devuelve la asignación recordada si el usuario aún la tiene', () => {
    rememberWorkContext({ companyId: 'c2', branchId: 'b2' });
    expect(recallWorkContext([a('c1', 'b1'), a('c2', 'b2')])?.companyId).toBe('c2');
  });

  it('no devuelve nada si la asignación ya no existe o no hay nada guardado', () => {
    expect(recallWorkContext([a('c1', 'b1')])).toBeNull();
    rememberWorkContext({ companyId: 'c9', branchId: 'b9' });
    expect(recallWorkContext([a('c1', 'b1')])).toBeNull();
  });

  it('forget borra lo recordado', () => {
    rememberWorkContext({ companyId: 'c1', branchId: 'b1' });
    forgetWorkContext();
    expect(recallWorkContext([a('c1', 'b1')])).toBeNull();
  });
});
