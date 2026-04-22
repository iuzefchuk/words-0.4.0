type VersionedCache<T> = { data: T; version: string };

export default class IndexedDbService<T> {
  private dbPromise: null | Promise<IDBDatabase> = null;

  constructor(
    private readonly dbName: string,
    private readonly storeName: string,
    private readonly cacheKey: string,
  ) {}

  async delete(): Promise<void> {
    try {
      const db = await this.openDatabase();
      await this.deleteCache(db);
    } catch {
      // silently fail — caching is best-effort
    }
  }

  async load(version: string): Promise<null | T> {
    try {
      const db = await this.openDatabase();
      const cache = await this.getCache(db);
      if (cache === undefined) return null;
      if (cache.version !== version) {
        await this.deleteCache(db);
        return null;
      }
      return cache.data;
    } catch {
      return null;
    }
  }

  async save(version: string, data: T): Promise<void> {
    try {
      const db = await this.openDatabase();
      await this.setCache(db, { data, version });
    } catch {
      // silently fail — caching is best-effort
    }
  }

  private deleteCache(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
      };
      transaction.objectStore(this.storeName).delete(this.cacheKey);
    });
  }

  private getCache(db: IDBDatabase): Promise<undefined | VersionedCache<T>> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).get(this.cacheKey);
      request.onsuccess = () => {
        resolve(request.result as undefined | VersionedCache<T>);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'));
      };
    });
  }

  private openDatabase(): Promise<IDBDatabase> {
    this.dbPromise ??= new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error ?? new Error('IndexedDB open failed'));
      };
    });
    return this.dbPromise;
  }

  private setCache(db: IDBDatabase, cache: VersionedCache<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
      };
      transaction.objectStore(this.storeName).put(cache, this.cacheKey);
    });
  }
}
