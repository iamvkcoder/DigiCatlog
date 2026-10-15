interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

class InMemoryTtlCache {
  private cache = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlSeconds = 600): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }

  invalidateShop(slugOrShopId: string): void {
    for (const key of this.cache.keys()) {
      if (key.includes(slugOrShopId)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const menuCache = new InMemoryTtlCache();
