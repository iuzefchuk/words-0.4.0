declare const brandSymbol: unique symbol;

type Brand<T, B extends string> = T & { readonly [brandSymbol]: B };

type Interval = ReturnType<typeof setInterval>;

type Timeout = ReturnType<typeof setTimeout>;

type Result<T, E> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: E };
