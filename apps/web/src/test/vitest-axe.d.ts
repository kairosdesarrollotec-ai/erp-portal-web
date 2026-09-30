// vitest v5 type augmentation for jest-axe matchers.
// jest-axe augments Jest's Matchers<R> but not vitest's Assertion<R>.
// export {} makes this a module augmentation, not a module override.
export {};

declare module 'vitest' {
  interface Assertion {
    toHaveNoViolations(): void;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
