import { queryCacheFactory } from 'd2c-rcaches';
import { REDIS_PASSWORD, REDIS_URL } from 'env';

export const cached = queryCacheFactory({
  url: REDIS_URL(),
  password: REDIS_PASSWORD(),
  ttl: 0,
});
