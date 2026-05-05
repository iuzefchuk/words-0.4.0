export default class LocalStorageGateway {
  static delete(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn('LocalStorageGateway:', error);
    }
  }

  static load(key: string): unknown {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (error) {
      console.warn('LocalStorageGateway:', error);
      LocalStorageGateway.delete(key);
      return null;
    }
  }

  static save(key: string, data: unknown): void {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.warn('LocalStorageGateway:', error);
    }
  }
}
