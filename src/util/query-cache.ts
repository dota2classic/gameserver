import { Cache, caching } from 'cache-manager';
import { CacheMiddleware } from '../gateway/util/outerQuery';
import { Injectable } from '@nestjs/common';
import * as redisStore from 'cache-manager-redis';
import { REDIS_PASSWORD, REDIS_URL } from 'env';

@Injectable()
export class QueryCache<T, B> implements CacheMiddleware<T, B> {
  private cache: Cache;

  constructor(public readonly ttl: number = 60) {
    const host = REDIS_URL()
      .replace('redis://', '')
      .split(':')[0];

    this.cache = caching({
      store: redisStore,
      // host: host, // default value
      host: '5.101.50.140', // default value
      port: 6379, // default value
      auth_pass: REDIS_PASSWORD(),
      db: 0,
      ttl,
    });

    // @ts-ignore

    this.cache.store.events.on('redisError', function(error) {
      // handle error here
      console.error(error);
    });
  }
  async getCached(query: T): Promise<B | undefined> {
    return this.cache.get(JSON.stringify(query)).then(t => t || undefined);
  }

  async setNew(query: T, value: B) {
    await this.cache.set(JSON.stringify(query), value, { ttl: this.ttl });
  }
}
