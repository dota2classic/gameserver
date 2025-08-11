import { IQuery, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { ClientProxy } from '@nestjs/microservices';
import { Logger, Type } from '@nestjs/common';
import { performance } from 'perf_hooks';
import { timeout } from 'rxjs/operators';

export interface CacheMiddleware<T, B> {
  getCached(query: T): Promise<B | undefined>;
  setNew(query: T, value: B): Promise<void>;
}

export function outerQuery<T extends IQuery, B>(
  type: Type<T>,
  provide = 'RedisQueue',
  cache?: CacheMiddleware<T, B>,
): any {
  // Small trick to set class.name dynamically, it is needed for nestjs
  const ClassName = `${type.name}Handler`;
  const context = {
    // @ts-ignore
    [ClassName]: class implements IQueryHandler<T, B> {
      private readonly logger = new Logger(ClassName);
      constructor(private readonly redis: ClientProxy) {}

      async execute(query: T): Promise<B> {
        if (cache) {
          const cached = await cache
            // @ts-ignore
            .getCached([type.name, [query]])
            .catch((e) => {
              console.error('nooo', e);
            });
          if (cached) {
            return cached;
          }
        }
        const time = performance.now();

        try {
          // @ts-ignore
          return await this.redis
            .send<B>(type.name, query)
            .pipe(timeout(5000))
            .toPromise();
        } catch (e) {
          this.logger.error(e);
        } finally {
          const newTime = performance.now();

          if (newTime - time > 1000) {
            this.logger.warn(`${type.name} took ${newTime - time} to finish`);
          }
        }

        // @ts-ignore
        return undefined;
      }
    },
  };

  QueryHandler(type)(context[ClassName]);

  return {
    provide: context[ClassName],
    useFactory(core: ClientProxy) {
      return new context[ClassName](core);
    },
    inject: [provide],
  };
}
