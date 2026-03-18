// Use Result for expected, recoverable failures (e.g. validation errors shown to users).
// Use throw for programmer errors and invariant violations (e.g. missing tiles, out-of-bounds).
export type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
