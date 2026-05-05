declare const APP_VERSION: string;

declare const brandSymbol: unique symbol;

type Brand<T, B extends string> = { readonly [brandSymbol]: B } & T;

type Interval = ReturnType<typeof setInterval>;

type Result<T, E> = { readonly error: E; readonly ok: false } | { readonly ok: true; readonly value: T };

type Timeout = ReturnType<typeof setTimeout>;
