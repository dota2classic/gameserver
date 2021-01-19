import { CacheModule, Module } from '@nestjs/common';
import { AppService } from 'app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { isDev, REDIS_PASSWORD, REDIS_URL } from 'env';
import { GameServerDomain } from 'gameserver';
import { CoreController } from 'core.controller';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { devDbConfig, Entities, prodDbConfig } from 'util/typeorm-config';
import { QueryController } from 'query.controller';
import { MatchController } from 'rest/match.controller';
import { Mapper } from 'rest/mapper';
import { PlayerController } from 'rest/player.controller';
import { InfoController } from 'rest/info.controller';
import { PlayerService } from 'rest/service/player.service';
import { SentryModule } from '@ntegral/nestjs-sentry';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [

    CacheModule.register(),
    ScheduleModule.forRoot(),
    SentryModule.forRoot({
      dsn:
        "https://67345366524f4d0fb7d9be3a26d6d3f2@o435989.ingest.sentry.io/5529665",
      debug: false,
      environment: isDev ? "dev" : "production",
      logLevel: 2, //based on sentry.io loglevel //
    }),
    CqrsModule,
    TypeOrmModule.forRoot(
      (isDev ? devDbConfig : prodDbConfig) as TypeOrmModuleOptions,
    ),
    TypeOrmModule.forFeature(Entities),
    ClientsModule.register([
      {
        name: 'QueryCore',
        transport: Transport.REDIS,
        options: {
          url: REDIS_URL(),
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
    InfoController
  ],
  providers: [AppService, PlayerService, Mapper, ...GameServerDomain],
})
export class AppModule {}
