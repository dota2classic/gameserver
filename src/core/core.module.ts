import { Global, Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { ScheduleModule } from "@nestjs/schedule";
import { CacheModule } from "@nestjs/cache-manager";
import { ClientsModule, RedisOptions, Transport } from "@nestjs/microservices";
import { ConfigService } from "@nestjs/config";
import { RabbitMQConfig, RabbitMQModule } from "@golevelup/nestjs-rabbitmq";
import { Configuration, ForumApi } from "generated-api/forum";
import { outerQuery } from "util/outerQuery";
import { GetUserInfoQuery } from "gateway/queries/GetUserInfo/get-user-info.query";
import { ReqLoggingInterceptor } from "rest/service/req-logging.interceptor";

const GetUserInfoQueryHandler = outerQuery(GetUserInfoQuery, 'QueryCore');

@Global()
@Module({
  imports: [
    CqrsModule,
    ScheduleModule.forRoot(),
    CacheModule.register({ isGlobal: true }),
    ClientsModule.registerAsync([
      {
        name: 'QueryCore',
        useFactory(config: ConfigService): RedisOptions {
          return {
            transport: Transport.REDIS,
            options: {
              host: config.get('redis.host'),
              password: config.get('redis.password'),
            },
          };
        },
        inject: [ConfigService],
      },
    ]),
    RabbitMQModule.forRootAsync({
      useFactory(config: ConfigService): RabbitMQConfig {
        return {
          exchanges: [{ name: 'app.events', type: 'topic' }],
          enableControllerDiscovery: true,
          uri: `amqp://${config.get('rabbitmq.user')}:${config.get('rabbitmq.password')}@${config.get('rabbitmq.host')}:${config.get('rabbitmq.port')}`,
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
  ],
  providers: [
    ReqLoggingInterceptor,
    GetUserInfoQueryHandler,
    {
      provide: ForumApi,
      useFactory: (config: ConfigService) =>
        new ForumApi(new Configuration({ basePath: config.get('api.forumApiUrl') })),
      inject: [ConfigService],
    },
  ],
  exports: [
    CqrsModule,
    ClientsModule,
    RabbitMQModule,
    ReqLoggingInterceptor,
    ForumApi,
    GetUserInfoQueryHandler,
  ],
})
export class CoreModule {}
