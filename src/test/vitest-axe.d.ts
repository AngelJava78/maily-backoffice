import 'vitest';
import type { AxeMatchers } from 'vitest-axe/matchers';

// Teaches Vitest's `expect` the `toHaveNoViolations()` matcher registered in setup.ts. The package
// ships its own typing for the legacy global `Vi` namespace, which Vitest no longer reads.
declare module 'vitest' {
  // The type parameter list has to match Vitest's own declaration for the interfaces to merge.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type, @typescript-eslint/no-unused-vars
  interface Assertion<T = any> extends AxeMatchers {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface AsymmetricMatchersContaining extends AxeMatchers {}
}
