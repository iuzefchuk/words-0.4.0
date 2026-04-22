export default class LocalStorage<T> {
  constructor(private readonly key: string) {}

  delete(): void {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // silently fail — caching is best-effort
    }
  }

  load(): null | T {
    try {
      const raw = localStorage.getItem(this.key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      this.delete();
      return null;
    }
  }

  save(data: T): void {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // silently fail — caching is best-effort
    }
  }
}
