import { ConfigService } from '@nestjs/config';
import { RedisOptions, Transport } from '@nestjs/microservices';

export const getRedisTransportOptions = (cs: ConfigService): RedisOptions => ({
  transport: Transport.REDIS,
  options: {
    host: cs.get('redis.host'),
    password: cs.get('redis.password'),
    retryAttempts: Infinity,
    retryDelay: 2000,
  },
});
