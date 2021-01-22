import { QueryCache } from 'util/query-cache';




export function cached(ttl: number, uniqueKey: string) {
  const cache = new QueryCache(ttl);


  return function(
    target: any,
    propertyKey: string,
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
