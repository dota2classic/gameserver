import { Module } from '@nestjs/common';
import { AppService } from 'app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, RedisOptions, RmqOptions, Transport } from '@nestjs/microservices';
import { GameServerDomain } from 'gameserver';
import { CoreController } from 'core.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Entities } from 'util/typeorm-config';
import { QueryController } from 'query.controller';
import { Mapper } from 'rest/mapper';
import { PlayerController } from 'rest/player.controller';
import { InfoController } from 'rest/info/info.controller';
import { PlayerService } from 'rest/service/player.service';
import { ScheduleModule } from '@nestjs/schedule';
import { MetaController } from 'rest/meta/meta.controller';
import { MetaService } from 'rest/meta/meta.service';
import { GetUserInfoQuery } from 'gateway/queries/GetUserInfo/get-user-info.query';
import { outerQuery } from 'gateway/util/outerQuery';
import { CacheModule } from '@nestjs/cache-manager';
import { MatchService } from 'rest/match/match.service';
import { MatchMapper } from 'rest/match/match.mapper';
import { MatchController } from 'rest/match/match.controller';
import { MetaMapper } from 'rest/meta/meta.mapper';
import { InfoMapper } from 'rest/info/info.mapper';
import { InfoService } from 'rest/info/info.service';
import { CrimeController } from 'rest/crime/crime.controller';
import configuration from 'util/configuration';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    CacheModule.register(),
    ScheduleModule.forRoot(),
    CqrsModule,
    TypeOrmModule.forRootAsync({
      useFactory(config: ConfigService): TypeOrmModuleOptions {
        return {
          type: "postgres",
          database: "postgres",
          host: config.get("postgres.host"),
          username: config.get("postgres.username"),
          password: config.get("postgres.password"),
          entities: Entities,

          port: 5432,
          synchronize: true,
          dropSchema: false,
          poolSize: 50,

          ssl: false,
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(Entities),
    ClientsModule.registerAsync([
      {
        name: 'RMQ',
        useFactory(config: ConfigService): RmqOptions {
          return {
            transport: Transport.RMQ,
            options: {
              urls: [
                {
                  hostname: config.get<string>('rabbitmq.host'),
                  port: config.get<number>('rabbitmq.port'),
                  protocol: 'amqp',
                  username: config.get<string>('rabbitmq.user'),
                  password: config.get<string>('rabbitmq.password'),
                },
              ],
              queue: config.get<string>('rabbitmq.queue'),
              queueOptions: {
                durable: true,
              },
              prefetchCount: 5,
            },
          };
        },
        inject: [ConfigService],
        imports: [],
      },
    ]),
    ClientsModule.registerAsync([
      {
        name: "QueryCore",
        useFactory(config: ConfigService): RedisOptions {
          return {
            transport: Transport.REDIS,
            options: {
              host: config.get("redis.host"),
              password: config.get("redis.password"),
            },
          };
        },
        inject: [ConfigService],
        imports: [],
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
    CrimeController,
  ],
  providers: [
    AppService,
    MetaService,
    MatchService,
    PlayerService,
    MatchMapper,
    MetaMapper,
    InfoMapper,
    InfoService,
    Mapper,
    ...GameServerDomain,
    outerQuery(GetUserInfoQuery, "QueryCore"),
  ],
})
export class AppModule {}
