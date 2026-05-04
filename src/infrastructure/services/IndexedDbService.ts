export default class IndexedDbService {
  private static readonly APP_VERSION_KEY = 'appVersion';

  private static readonly DB_PROMISES = new Map<string, Promise<IDBDatabase>>();

  private static readonly META_NAME = 'meta';

  private static readonly PAYLOAD_NAME = 'payload';

  private static readonly SCHEMA_VERSION = 3;

  static async append(dbName: string, appVersion: string, payload: ReadonlyArray<unknown>): Promise<void> {
    if (payload.length === 0) return;
    try {
      const db = await IndexedDbService.openDatabase(dbName);
      await IndexedDbService.appendBatch(db, appVersion, payload);
    } catch (error) {
      console.warn('IndexedDbService:', error);
    }
  }

  static async delete(dbName: string): Promise<void> {
    try {
      const db = await IndexedDbService.openDatabase(dbName);
      await IndexedDbService.clearAll(db);
    } catch (error) {
      console.warn('IndexedDbService:', error);
    }
  }

  static async load(dbName: string, appVersion: string): Promise<null | ReadonlyArray<unknown>> {
    try {
      const db = await IndexedDbService.openDatabase(dbName);
      const storedAppVersion = await IndexedDbService.getStoredAppVersion(db);
      if (storedAppVersion === undefined) return null;
      if (storedAppVersion !== appVersion) {
        await IndexedDbService.clearAll(db);
        return null;
      }
      return await IndexedDbService.getAllPayload(db);
    } catch (error) {
      console.warn('IndexedDbService:', error);
      return null;
    }
  }

  private static appendBatch(db: IDBDatabase, appVersion: string, payload: ReadonlyArray<unknown>): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDbService.PAYLOAD_NAME, IndexedDbService.META_NAME], 'readwrite');
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
      };
      const payloadStore = transaction.objectStore(IndexedDbService.PAYLOAD_NAME);
      for (const payloadItem of payload) payloadStore.add(payloadItem);
      transaction.objectStore(IndexedDbService.META_NAME).put(appVersion, IndexedDbService.APP_VERSION_KEY);
    });
  }

  private static clearAll(db: IDBDatabase): Promise<void> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([IndexedDbService.PAYLOAD_NAME, IndexedDbService.META_NAME], 'readwrite');
      transaction.oncomplete = () => {
        resolve();
      };
      transaction.onerror = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction failed'));
      };
      transaction.onabort = () => {
        reject(transaction.error ?? new Error('IndexedDB transaction aborted'));
      };
      transaction.objectStore(IndexedDbService.PAYLOAD_NAME).clear();
      transaction.objectStore(IndexedDbService.META_NAME).clear();
    });
  }

  private static getAllPayload(db: IDBDatabase): Promise<ReadonlyArray<unknown>> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDbService.PAYLOAD_NAME, 'readonly');
      const request = transaction.objectStore(IndexedDbService.PAYLOAD_NAME).getAll();
      request.onsuccess = () => {
        resolve(request.result as ReadonlyArray<unknown>);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'));
      };
    });
  }

  private static getStoredAppVersion(db: IDBDatabase): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(IndexedDbService.META_NAME, 'readonly');
      const request = transaction.objectStore(IndexedDbService.META_NAME).get(IndexedDbService.APP_VERSION_KEY);
      request.onsuccess = () => {
        resolve(request.result as string | undefined);
      };
      request.onerror = () => {
        reject(request.error ?? new Error('IndexedDB request failed'));
      };
    });
  }

  private static openDatabase(dbName: string): Promise<IDBDatabase> {
    let promise = IndexedDbService.DB_PROMISES.get(dbName);
    if (promise !== undefined) return promise;
    promise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, IndexedDbService.SCHEMA_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        for (const name of Array.from(db.objectStoreNames)) db.deleteObjectStore(name);
        db.createObjectStore(IndexedDbService.PAYLOAD_NAME, { autoIncrement: true });
        db.createObjectStore(IndexedDbService.META_NAME);
      };
      request.onsuccess = () => {
        resolve(request.result);
      };
      request.onerror = () => {
        IndexedDbService.DB_PROMISES.delete(dbName);
        reject(request.error ?? new Error('IndexedDB open failed'));
      };
    });
    IndexedDbService.DB_PROMISES.set(dbName, promise);
    return promise;
  }
}
