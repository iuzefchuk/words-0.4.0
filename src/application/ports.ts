export type Clock = {
  now(): number;
  wait(ms: number): Promise<void>;
};

export type Scheduler = {
  yield(): Promise<void>;
};

export type VersionProvider = {
  get version(): string;
};