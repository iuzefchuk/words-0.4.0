import { AppDependencies } from '@/application/types.ts';
import { DictionaryRepository, GameRepository } from '@/domain/ports.ts';
import { GameSnapshot } from '@/domain/types.ts';
import AppVersionProvider from '@/infrastructure/services/AppVersionProvider.ts';
import IdGenerator from '@/infrastructure/services/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/services/DateApiClock.ts';
import IndexedDb from '@/infrastructure/services/IndexedDb.ts';
import WebScheduler from '@/infrastructure/services/WebScheduler.ts';
import type { DictionarySnapshot } from '@/domain/models/Dictionary.ts';

class IndexedDbDictionaryRepository implements DictionaryRepository {
  private static readonly CACHE_KEY = 'state';
  private static readonly DB_NAME = 'words-dictionary';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'dictionary';

  private readonly db = new IndexedDb<DictionarySnapshot>(
    IndexedDbDictionaryRepository.DB_NAME,
    IndexedDbDictionaryRepository.STORE_NAME,
    IndexedDbDictionaryRepository.CACHE_KEY,
  );

  async load(): Promise<DictionarySnapshot | null> {
    return this.db.load(IndexedDbDictionaryRepository.DB_VERSION);
  }

  async save(snapshot: DictionarySnapshot): Promise<void> {
    await this.db.save(IndexedDbDictionaryRepository.DB_VERSION, snapshot);
  }
}

class IndexedDbGameRepository implements GameRepository {
  private static readonly CACHE_KEY = 'state';
  private static readonly DB_NAME = 'words-game';
  private static readonly DB_VERSION = 1;
  private static readonly STORE_NAME = 'game';

  private readonly db = new IndexedDb<GameSnapshot>(
    IndexedDbGameRepository.DB_NAME,
    IndexedDbGameRepository.STORE_NAME,
    IndexedDbGameRepository.CACHE_KEY,
  );

  async delete(): Promise<void> {
    await this.db.delete();
  }

  async load(): Promise<GameSnapshot | null> {
    return this.db.load(IndexedDbGameRepository.DB_VERSION);
  }

  async save(snapshot: GameSnapshot): Promise<void> {
    await this.db.save(IndexedDbGameRepository.DB_VERSION, snapshot);
  }
}

export default class Infrastructure {
  static async createAppDependencies(): Promise<AppDependencies> {
    return {
      clock: new DateApiClock(),
      idGenerator: new IdGenerator(),
      repositories: {
        dictionary: new IndexedDbDictionaryRepository(),
        game: new IndexedDbGameRepository(),
      },
      scheduler: new WebScheduler(),
      versionProvider: new AppVersionProvider(),
    };
  }
}
