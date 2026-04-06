import type { Clock, Scheduler, VersionProvider } from '@/application/ports.ts';
import type { DictionarySnapshot } from '@/domain/models/Dictionary.ts';
import type { DictionaryRepository, GameRepository, IdGenerator } from '@/domain/ports.ts';
import type { GameSnapshot } from '@/domain/types.ts';

export class StubClock implements Clock {
  private _now = 0;

  now(): number {
    return this._now++;
  }

  setNow(value: number): void {
    this._now = value;
  }

  wait(): Promise<void> {
    return Promise.resolve();
  }
}

export class StubDictionaryRepository implements DictionaryRepository {
  private store: DictionarySnapshot | null = null;

  async load(): Promise<DictionarySnapshot | null> {
    return this.store;
  }

  async save(snapshot: DictionarySnapshot): Promise<void> {
    this.store = snapshot;
  }
}

export class StubGameRepository implements GameRepository {
  private store: GameSnapshot | null = null;

  async delete(): Promise<void> {
    this.store = null;
  }

  async load(): Promise<GameSnapshot | null> {
    return this.store;
  }

  async save(snapshot: GameSnapshot): Promise<void> {
    this.store = snapshot;
  }
}

export class StubIdGenerator implements IdGenerator {
  private counter = 0;

  execute(): string {
    return `id-${this.counter++}`;
  }
}

export class StubScheduler implements Scheduler {
  yield(): Promise<void> {
    return Promise.resolve();
  }
}

export class StubVersionProvider implements VersionProvider {
  get version(): string {
    return this._version;
  }

  constructor(private _version: string = '1.0.0') {}

  setVersion(v: string): void {
    this._version = v;
  }
}
