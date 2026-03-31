import { AppDependencies } from '@/application/types.ts';
import type { DictionarySnapshot } from '@/domain/models/Dictionary.ts';
import { DictionaryRepository, GameRepository } from '@/domain/ports.ts';
import { GameSnapshot } from '@/domain/types.ts';
import AppVersionProvider from '@/infrastructure/services/AppVersionProvider.ts';
import IdGenerator from '@/infrastructure/services/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/services/DateApiClock.ts';
import IndexedDb from '@/infrastructure/services/IndexedDb.ts';
import WebScheduler from '@/infrastructure/services/WebScheduler.ts';

export default class Infrastructure {
  static async createAppDependencies(): Promise<AppDependencies> {
    return {
      idGenerator: new IdGenerator(),
      clock: new DateApiClock(),
      scheduler: new WebScheduler(),
      versionProvider: new AppVersionProvider(),
      repositories: {
        game: new IndexedDbGameRepository(),
        dictionary: new IndexedDbDictionaryRepository(),
      },
    };
  }
}

class IndexedDbDictionaryRepository implements DictionaryRepository {
  private static readonly DB_VERSION = 1;
  private static readonly DB_NAME = 'words-dictionary';
  private static readonly STORE_NAME = 'dictionary';
  private static readonly CACHE_KEY = 'state';

  private readonly db = new IndexedDb<DictionarySnapshot>(
    IndexedDbDictionaryRepository.DB_NAME,
    IndexedDbDictionaryRepository.STORE_NAME,
    IndexedDbDictionaryRepository.CACHE_KEY,
  );

  async save(snapshot: DictionarySnapshot): Promise<void> {
    await this.db.save(IndexedDbDictionaryRepository.DB_VERSION, snapshot);
  }

  async load(): Promise<DictionarySnapshot | null> {
    return this.db.load(IndexedDbDictionaryRepository.DB_VERSION);
  }
}

class IndexedDbGameRepository implements GameRepository {
  private static readonly DB_VERSION = 1;
  private static readonly DB_NAME = 'words-game';
  private static readonly STORE_NAME = 'game';
  private static readonly CACHE_KEY = 'state';

  private readonly db = new IndexedDb<GameSnapshot>(
    IndexedDbGameRepository.DB_NAME,
    IndexedDbGameRepository.STORE_NAME,
    IndexedDbGameRepository.CACHE_KEY,
  );

  async save(snapshot: GameSnapshot): Promise<void> {
    await this.db.save(IndexedDbGameRepository.DB_VERSION, snapshot);
  }

  async load(): Promise<GameSnapshot | null> {
    return this.db.load(IndexedDbGameRepository.DB_VERSION);
  }

  async delete(): Promise<void> {
    await this.db.delete();
  }
}
