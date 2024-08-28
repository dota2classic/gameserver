import { RedisStore, redisStore } from 'cache-manager-redis-yet';

export interface CacheMiddleware<T, B> {
  getCached(query: T): Promise<B | undefined>;
  setNew(query: T, value: B): Promise<void>;
}

export interface RedisConfiguration {
  url: string;
  ttl: number;
  password: string;
}

export class QueryCache<T, B> implements CacheMiddleware<T, B> {
  private cache: Promise<RedisStore>;

  constructor(public readonly config: RedisConfiguration) {
    // this.cache = caching({
    //   store: redisStore,
    //   host: host, // default value
    //   port: 6379, // default value
    //   auth_pass: config.password,
    //   db: 0,
    //   ttl: config.ttl,
    // });

    this.cache = redisStore({
      url: this.config.url,
      ttl: this.config.ttl,
      password: this.config.password
    })

  }

  public async resolve() {}

  async getCached(query: T): Promise<B | undefined> {
    return this.cache.then(it =>
      it.get<B>(JSON.stringify(query)).then(t => t || undefined),
    );
  }

  async setNew(query: T, value: B) {
    await this.cache.then(it =>
      it.set(JSON.stringify(query), value, this.config.ttl),
    );
  }
}

export function cached(config: RedisConfiguration, uniqueKey: string) {
  const cache = new QueryCache(config);

  return function(
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const cached = await cache.getCached([uniqueKey, args]);

      if (cached === undefined) {
        const result = await originalMethod.apply(this, args);

        await cache.setNew([uniqueKey, args], result);
        return result;
      }
      return cached;
    };
  };
}

export function queryCacheFactory(config: RedisConfiguration) {
  return (ttl: number, key: string) =>
    cached(
      {
        ...config,
        ttl,
      },
      key,
    );
}
