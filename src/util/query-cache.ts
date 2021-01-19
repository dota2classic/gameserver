import {caching, Cache} from "cache-manager"
import { CacheMiddleware } from '../gateway/util/outerQuery';

export class QueryCache<T, B> implements CacheMiddleware<T, B> {
  private cache: Cache;

  constructor(public readonly ttl: number = 60) {
    this.cache = caching({
      store: "memory",
      max: 5000,
      ttl,
    });
  }
  async getCached(query: T): Promise<B | undefined> {
    return this.cache.get(JSON.stringify(query));
  }

  async setNew(query: T, value: B) {
    await this.cache.set(JSON.stringify(query), value, { ttl: this.ttl });
  }
}
