import { AppDependencies, DomainDictionary, DomainDictionaryProps } from '@/application/types.ts';
import IdGenerator from '@/infrastructure/services/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/services/DateApiClock.ts';
import IndexedDb from '@/infrastructure/services/IndexedDb.ts';
import WebScheduler from '@/infrastructure/services/WebScheduler.ts';

export default class Infrastructure {
  private static readonly CACHE_VERSION = 3;
  private static readonly DICTIONARY_DB_NAME = 'words-dictionary';
  private static readonly DICTIONARY_STORE_NAME = 'props';
  private static readonly DICTIONARY_CACHE_KEY = 'dictionary';

  static async createAppDependencies(): Promise<AppDependencies> {
    const dictionary = await this.createDictionary();
    const idGenerator = new IdGenerator();
    const clock = new DateApiClock();
    const scheduler = new WebScheduler();
    return { dictionary, idGenerator, clock, scheduler };
  }

  private static async createDictionary(): Promise<DomainDictionary> {
    const db = new IndexedDb<DomainDictionaryProps>(
      this.DICTIONARY_DB_NAME,
      this.DICTIONARY_STORE_NAME,
      this.DICTIONARY_CACHE_KEY,
    );
    const cache = await db.load(this.CACHE_VERSION);
    if (cache) {
      const dictionary = DomainDictionary.restoreFromProps(cache);
      if (dictionary) return dictionary;
    }
    const dictionary = DomainDictionary.create();
    db.save(this.CACHE_VERSION, dictionary[this.DICTIONARY_STORE_NAME]);
    return dictionary;
  }
}
