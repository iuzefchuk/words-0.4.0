import Application, { TurnGenerationWorker } from '@/application/index.ts';
import { AppDomain, AppPlayer, AppCell, AppTile, AppDictionary, AppDictionaryCache } from '@/application/types.ts';
import IdGenerator from '@/infrastructure/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/DateApiClock.ts';
import WebWorker from '@/infrastructure/WebWorker.ts';
import IndexedDb from '@/infrastructure/IndexedDb.ts';

export default class ApplicationFactory {
  private static readonly CACHE_VERSION = 1;
  private static readonly DICTIONARY_WORKER_PATH = './workers/TurnGeneratorWorker.ts';
  private static readonly DICTIONARY_DB_NAME = 'words-dictionary';
  private static readonly DICTIONARY_STORE_NAME = 'cache';
  private static readonly DICTIONARY_CACHE_KEY = 'dictionary';

  static async execute(): Promise<Application> {
    const dictionary = await this.createDictionary();
    const turnGenerationWorker = this.createTurnGenerationWorker();
    const idGenerator = new IdGenerator();
    const clock = new DateApiClock();
    return Application.create({ dictionary, turnGenerationWorker, idGenerator, clock });
  }

  private static async createDictionary(): Promise<AppDictionary> {
    const db = new IndexedDb<AppDictionaryCache>(
      this.DICTIONARY_DB_NAME,
      this.DICTIONARY_STORE_NAME,
      this.DICTIONARY_CACHE_KEY,
    );
    const cache = await db.load(this.CACHE_VERSION);
    if (cache) {
      const dictionary = AppDictionary.createFromCache(cache);
      if (dictionary) return dictionary;
    }
    const dictionary = AppDictionary.create();
    db.save(this.CACHE_VERSION, dictionary[this.DICTIONARY_STORE_NAME]);
    return dictionary;
  }

  private static createTurnGenerationWorker(): TurnGenerationWorker {
    return WebWorker.create<
      { domain: AppDomain; player: AppPlayer },
      { tiles: ReadonlyArray<AppTile>; cells: ReadonlyArray<AppCell> }
    >(ApplicationFactory.DICTIONARY_WORKER_PATH);
  }
}
