type VersionedCache<T> = { version: number; data: T };

export default class IndexedDb<T> {
  constructor(
    private readonly dbName: string,
    private readonly storeName: string,
    private readonly cacheKey: string,
  ) {}

  async load(version: number): Promise<T | null> {
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

  async save(version: number, data: T): Promise<void> {
    try {
      const db = await this.openDatabase();
      await this.setCache(db, { version, data });
      db.close();
    } catch {
      // silently fail — caching is best-effort
    }
  }

  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 2);
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(this.storeName)) {
          request.result.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getCache(db: IDBDatabase): Promise<VersionedCache<T> | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readonly');
      const request = transaction.objectStore(this.storeName).get(this.cacheKey);
      request.onsuccess = () => resolve(request.result as VersionedCache<T> | undefined);
      request.onerror = () => reject(request.error);
    });
  }

  private setCache(db: IDBDatabase, cache: VersionedCache<T>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.storeName, 'readwrite');
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
      transaction.objectStore(this.storeName).put(cache, this.cacheKey);
    });
  }
}
