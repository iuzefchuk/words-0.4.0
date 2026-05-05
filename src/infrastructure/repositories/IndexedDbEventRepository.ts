import { GameEvent } from '@/application/types/index.ts';
import { EventRepository } from '@/application/types/repositories.ts';
import IndexedDbGateway from '@/infrastructure/gateways/IndexedDbGateway.ts';

export default class IndexedDbEventRepository implements EventRepository {
  private static readonly DB_NAME = 'events';

  private persistedEventsCount = 0;

  constructor(private readonly appVersion: string) {}

  async append(events: ReadonlyArray<GameEvent>): Promise<void> {
    const start = this.persistedEventsCount;
    // Claim the range synchronously so back-to-back fire-and-forget calls don't double-write.
    this.persistedEventsCount = events.length;
    await IndexedDbGateway.append(IndexedDbEventRepository.DB_NAME, this.appVersion, events.slice(start));
  }

  async delete(): Promise<void> {
    this.persistedEventsCount = 0;
    await IndexedDbGateway.delete(IndexedDbEventRepository.DB_NAME);
  }

  async load(): Promise<null | ReadonlyArray<GameEvent>> {
    const events = (await IndexedDbGateway.load(
      IndexedDbEventRepository.DB_NAME,
      this.appVersion,
    )) as null | ReadonlyArray<GameEvent>;
    this.persistedEventsCount = events?.length ?? 0;
    return events;
  }
}
