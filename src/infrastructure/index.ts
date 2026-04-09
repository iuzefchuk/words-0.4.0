import { AppDependencies } from '@/application/types.ts';
import { DictionaryRepository, EventRepository, GameEvent } from '@/domain/types.ts';
import AsyncSchedulingService from '@/infrastructure/services/AsyncSchedulingService.ts';
import CryptoIdentityService from '@/infrastructure/services/CryptoIdentityService.ts';
import CryptoSeedingService from '@/infrastructure/services/CryptoSeedingService.ts';
import FetchCompressionService from '@/infrastructure/services/FetchCompressionService.ts';
import StorageService from '@/infrastructure/services/StorageService.ts';
import VersioningService from '@/infrastructure/services/VersioningService.ts';
import type { DictionarySnapshot } from '@/domain/models/dictionary/types.ts';

class IndexedDbDictionaryRepository implements DictionaryRepository {
  private static readonly CACHE_KEY = 'state';

  private static readonly DB_NAME = 'words-dictionary';

  private static readonly STORE_NAME = 'dictionary';

  private readonly db = new StorageService<DictionarySnapshot>(
    IndexedDbDictionaryRepository.DB_NAME,
    IndexedDbDictionaryRepository.STORE_NAME,
    IndexedDbDictionaryRepository.CACHE_KEY,
  );

  constructor(private readonly version: string) {}

  async load(): Promise<DictionarySnapshot | null> {
    return this.db.load(this.version);
  }

  async save(snapshot: DictionarySnapshot): Promise<void> {
    await this.db.save(this.version, snapshot);
  }
}

class IndexedDbEventRepository implements EventRepository {
  private static readonly CACHE_KEY = 'state';

  private static readonly DB_NAME = 'words-events';

  private static readonly STORE_NAME = 'events';

  private readonly db = new StorageService<ReadonlyArray<GameEvent>>(
    IndexedDbEventRepository.DB_NAME,
    IndexedDbEventRepository.STORE_NAME,
    IndexedDbEventRepository.CACHE_KEY,
  );

  constructor(private readonly version: string) {}

  async delete(): Promise<void> {
    await this.db.delete();
  }

  async load(): Promise<null | ReadonlyArray<GameEvent>> {
    return this.db.load(this.version);
  }

  async save(events: ReadonlyArray<GameEvent>): Promise<void> {
    await this.db.save(this.version, events);
  }
}

export default class Infrastructure {
  static async createAppDependencies(): Promise<AppDependencies> {
    const version = new VersioningService().getAppVersion();
    return {
      repositories: {
        dictionary: new IndexedDbDictionaryRepository(version),
        events: new IndexedDbEventRepository(version),
      },
      services: {
        compression: new FetchCompressionService(),
        identity: new CryptoIdentityService(),
        scheduling: new AsyncSchedulingService(),
        seeding: new CryptoSeedingService(),
      },
    };
  }
}
