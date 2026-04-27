import { GameEvent } from '@/application/types/index.ts';
import { EventRepository } from '@/application/types/repositories.ts';
import IndexedDbService from '@/infrastructure/services/IndexedDbService.ts';

export default class IndexedDbEventRepository implements EventRepository {
  private static readonly CACHE_KEY = 'state';

  private static readonly DB_NAME = 'words-events';

  // Bump when the GameEvent shape changes in a backwards-incompatible way.
  private static readonly EVENT_SCHEMA_VERSION = '1';

  private static readonly STORE_NAME = 'events';

  private readonly cacheVersion: string;

  private readonly db = new IndexedDbService<ReadonlyArray<GameEvent>>(
    IndexedDbEventRepository.DB_NAME,
    IndexedDbEventRepository.STORE_NAME,
    IndexedDbEventRepository.CACHE_KEY,
  );

  constructor(appVersion: string) {
    this.cacheVersion = `${appVersion}:schema-${IndexedDbEventRepository.EVENT_SCHEMA_VERSION}`;
  }

  async delete(): Promise<void> {
    await this.db.delete();
  }

  async load(): Promise<null | ReadonlyArray<GameEvent>> {
    return this.db.load(this.cacheVersion);
  }

  async save(events: ReadonlyArray<GameEvent>): Promise<void> {
    await this.db.save(this.cacheVersion, events);
  }
}
