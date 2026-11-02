/** Compile-time exhaustiveness check: a `switch` that misses a case stops type-checking. */
export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}
