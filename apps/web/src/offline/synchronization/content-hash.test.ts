import { describe, expect, it, vi } from 'vitest';
import { computeContentHash, sha256HexPure, SHA256_HEX } from './content-hash';

const enc = (s: string) => new TextEncoder().encode(s);

describe('content-hash (SHA-256)', () => {
  it('respaldo en JS: vectores oficiales (vacio, abc, 2 bloques)', () => {
    expect(sha256HexPure(enc(''))).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256HexPure(enc('abc'))).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    expect(sha256HexPure(enc('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
  });

  it('usa crypto.subtle cuando existe y coincide con el respaldo', async () => {
    const blob = new Blob(['contenido de la foto']);
    const viaSubtle = await computeContentHash(blob);
    const viaFallback = await computeContentHash(blob, { subtle: null });
    expect(viaSubtle).toMatch(SHA256_HEX);
    expect(viaFallback).toBe(viaSubtle);
  });

  it('llama a subtle.digest con SHA-256', async () => {
    const digest = vi.fn(async () => new Uint8Array(32).buffer);
    const hash = await computeContentHash(new Blob(['x']), { subtle: { digest } as unknown as SubtleCrypto });
    expect(digest).toHaveBeenCalledWith('SHA-256', expect.anything());
    expect(hash).toBe('0'.repeat(64));
  });

  it('cae al respaldo si subtle.digest falla (contexto no seguro)', async () => {
    const digest = vi.fn(async () => {
      throw new Error('insecure context');
    });
    const hash = await computeContentHash(new Blob(['abc']), { subtle: { digest } as unknown as SubtleCrypto });
    expect(hash).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('el mismo contenido da el mismo hash y distinto contenido, otro', async () => {
    const a = await computeContentHash(new Blob(['a']), { subtle: null });
    const a2 = await computeContentHash(new Blob(['a']), { subtle: null });
    const b = await computeContentHash(new Blob(['b']), { subtle: null });
    expect(a).toBe(a2);
    expect(a).not.toBe(b);
  });

  it('archivos grandes (>1 bloque, longitud en bits en 64 bits) coinciden con subtle', async () => {
    const big = new Uint8Array(300_000).map((_, i) => i % 251);
    const blob = new Blob([big]);
    expect(await computeContentHash(blob, { subtle: null })).toBe(await computeContentHash(blob));
  });
});
