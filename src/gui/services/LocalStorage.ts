type StoragePayload = { data: unknown; timestamp: number };

export default class LocalStorage {
  static delete(key: string): void {
    localStorage.removeItem(key);
  }

  static load(key: string, expireMs: number = 0): null | unknown {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      const payload: StoragePayload = JSON.parse(raw);
      if (this.isPayloadExpired(expireMs, payload.timestamp)) {
        localStorage.removeItem(key);
        return null;
      }
      return payload.data;
    } catch {
      localStorage.removeItem(key);
      return null;
    }
  }

  static save(key: string, data: unknown): void {
    const payload: StoragePayload = { data, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(payload));
  }

  private static isPayloadExpired(expireMs: number, timestamp: number): boolean {
    return expireMs > 0 && Date.now() > timestamp + expireMs;
  }
}
