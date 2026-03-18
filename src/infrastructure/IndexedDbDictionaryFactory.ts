import Dictionary from '@/domain/models/Dictionary.ts';
import { DICTIONARY_DATA } from '@/domain/constants.ts';
import { DictionaryCache } from '@/domain/models/Dictionary.ts';

type VersionedCache = { version: number; data: DictionaryCache };

export default class IndexedDbDictionaryFactory {
  private static readonly CACHE_VERSION = DICTIONARY_DATA.length;

  static async create(): Promise<Dictionary> {
    const cache = await this.IndexedDbManager.load(this.CACHE_VERSION);
    if (cache) {
      const dictionary = Dictionary.createFromCache(cache);
      if (dictionary) return dictionary;
    }
    const dictionary = Dictionary.create();
    const versionedCache: VersionedCache = { version: this.CACHE_VERSION, data: dictionary.cache };
    this.IndexedDbManager.save(versionedCache);
    return dictionary;
  }

  static IndexedDbManager = class {
    private static readonly DB_NAME = 'words-dictionary';
    private static readonly STORE_NAME = 'cache';
    private static readonly CACHE_KEY = 'dictionary';

    static async load(version: number): Promise<DictionaryCache | null> {
      try {
        const db = await this.openDatabase();
        const cache = await this.getCache(db);
        db.close();
        if (!cache || cache.version !== version) return null;
        return cache.data;
      } catch {
        return null;
      }
    }

    static async save(cache: VersionedCache): Promise<void> {
      try {
        const db = await this.openDatabase();
        await this.setCache(db, cache);
        db.close();
      } catch {
        // silently fail — caching is best-effort
      }
    }

    private static openDatabase(): Promise<IDBDatabase> {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open(this.DB_NAME, 1);
        request.onupgradeneeded = () => request.result.createObjectStore(this.STORE_NAME);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    private static getCache(db: IDBDatabase): Promise<VersionedCache | undefined> {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readonly');
        const request = transaction.objectStore(this.STORE_NAME).get(this.CACHE_KEY);
        request.onsuccess = () => resolve(request.result as VersionedCache | undefined);
        request.onerror = () => reject(request.error);
      });
    }

    private static setCache(db: IDBDatabase, cache: VersionedCache): Promise<void> {
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(this.STORE_NAME, 'readwrite');
        const request = transaction.objectStore(this.STORE_NAME).put(cache, this.CACHE_KEY);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  };
}
