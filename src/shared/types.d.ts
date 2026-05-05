declare const APP_VERSION: string;

declare module '*?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}

declare const brandSymbol: unique symbol;

// TODO move to SchedulerGateway
declare const schedulerService: { yield(): Promise<void> };

type Brand<T, B extends string> = { readonly [brandSymbol]: B } & T;

type Interval = ReturnType<typeof setInterval>;

type Result<T, E> = { readonly error: E; readonly ok: false } | { readonly ok: true; readonly value: T };

type Timeout = ReturnType<typeof setTimeout>;
