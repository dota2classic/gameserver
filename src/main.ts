import { otelSDK } from 'tracer';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandBus, EventBus, EventPublisher, ofType, QueryBus } from '@nestjs/cqrs';
import { RmqOptions, Transport } from '@nestjs/microservices';
import { inspect } from 'util';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ServerActualizationRequestedEvent } from 'gateway/events/gs/server-actualization-requested.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { ServerSessionSyncEvent } from 'gateway/events/gs/server-session-sync.event';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import './util/promise';
import configuration from 'util/configuration';
import { ConfigService } from '@nestjs/config';
import { WinstonWrapper } from 'util/logger';

export function prepareModels(publisher: EventPublisher) {
  // publisher.mergeClassContext(GameServerModel);
}

async function bootstrap() {
  await otelSDK.start();

  const parsedConfig = configuration();
  const config = new ConfigService(parsedConfig);


  const app = await NestFactory.create(AppModule, {
    logger: new WinstonWrapper(
      config.get("fluentbit.host"),
      config.get<number>("fluentbit.port"),
      config.get<boolean>("fluentbit.disabled"),
    ),
  });

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      username: 'default',
      host: config.get('redis.host'),
      port: 6379,
      retryAttempts: Infinity,
      retryDelay: 5000,
      password: config.get('redis.password')
    },
  });

  app.connectMicroservice<RmqOptions>({
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
      queue: config.get<string>('rabbitmq.srcds_events'),
      prefetchCount: 5,
      noAck: false,
      queueOptions: {
        durable: true,
      },
    },
  });

  const options = new DocumentBuilder()
    .setTitle('GameServer api')
    .setDescription('Matches, players, mmrs')
    .setVersion('1.0')
    .addTag('game')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup('api', app, document);

  await app.listen(5003);

  await app.startAllMicroservices();

  const publisher = app.get(EventPublisher);
  prepareModels(publisher);

  const ebus = app.get(EventBus);
  const cbus = app.get(CommandBus);
  const qbus = app.get(QueryBus);

  const clogger = new Logger('CommandLogger');
  const elogger = new Logger('EventLogger');
  const qlogger = new Logger('EventLogger');

  ebus.subscribe(e => {
    if (e.constructor.name === ServerActualizationRequestedEvent.name) return;
    if (e.constructor.name === ServerSessionSyncEvent.name) return;
    if (e.constructor.name === LiveMatchUpdateEvent.name) return;
    if (e.constructor.name === GameServerDiscoveredEvent.name) return;
    if (e.constructor.name === ServerStatusEvent.name) return;

    elogger.log(`${inspect(e)}`);
  });

  // qbus.subscribe(e => {
  //   qlogger.log(`${inspect(e)}`);
  // });

  cbus.pipe(ofType(FindGameServerCommand)).subscribe(e => {
    clogger.log(
      `${inspect(e)}`,
      // e.__proto__.constructor.name,
    );
  });

  // const ms = app.get(MatchService);
  //
  // const [data, cnt] = await ms.getMatchPageFastest(0, 25, MatchmakingMode.UNRANKED);
  // if(data.length !== 25){
  //
  //   console.error("Wrong", data.length)
  // }


}
bootstrap();
