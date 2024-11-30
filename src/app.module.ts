import { Module } from '@nestjs/common';
import { AppService } from 'app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT, REDIS_URL } from 'env';
import { GameServerDomain } from 'gameserver';
import { CoreController } from 'core.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entities, prodDbConfig } from 'util/typeorm-config';
import { QueryController } from 'query.controller';
import { Mapper } from 'rest/mapper';
import { PlayerController } from 'rest/player.controller';
import { InfoController } from 'rest/info.controller';
import { PlayerService } from 'rest/service/player.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MetaController } from 'rest/meta/meta.controller';
import { MetaService } from 'rest/meta/meta.service';
import { GetUserInfoQuery } from 'gateway/queries/GetUserInfo/get-user-info.query';
import { outerQuery } from 'gateway/util/outerQuery';
import { QueryCache } from 'rcache';
import { CacheModule } from '@nestjs/cache-manager';
import { MatchService } from 'rest/match/match.service';
import { CrimeController } from 'rest/crime.controller';
import { MatchMapper } from 'rest/match/match.mapper';
import { MatchController } from 'rest/match/match.controller';
import { MetaMapper } from 'rest/meta/meta.mapper';


export function qCache<T, B>() {
  return new QueryCache<T, B>({
    url: REDIS_URL(),
    password: REDIS_PASSWORD(),
    ttl: 10,
  });
}

@Module({
  imports: [
    CacheModule.register(),
    ScheduleModule.forRoot(),
    CqrsModule,
    TypeOrmModule.forRoot(
      prodDbConfig
    ),
    TypeOrmModule.forFeature(Entities),
    ClientsModule.register([
      {
        name: 'QueryCore',
        transport: Transport.REDIS,
        options: {
          host: REDIS_HOST(),
          port: parseInt(REDIS_PORT() as string),
          retryAttempts: Infinity,
          password: REDIS_PASSWORD(),
          retryDelay: 5000,
        },
      },
    ]),
  ],
  controllers: [
    CoreController,
    QueryController,
    MatchController,
    PlayerController,
    InfoController,
    MetaController,
    CrimeController
  ],
  providers: [
    AppService,
    MetaService,
    MatchService,
    PlayerService,
    MatchMapper,
    MetaMapper,
    Mapper,
    ...GameServerDomain,
    outerQuery(GetUserInfoQuery, 'QueryCore', qCache())
  ],
})
export class AppModule {}
