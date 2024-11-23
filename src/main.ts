import { otelSDK } from 'tracer';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandBus, EventBus, EventPublisher, ofType, QueryBus } from '@nestjs/cqrs';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from 'env';
import { Transport } from '@nestjs/microservices';
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

export function prepareModels(publisher: EventPublisher) {
  // publisher.mergeClassContext(GameServerModel);
}

async function bootstrap() {
  await otelSDK.start();
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      host: REDIS_HOST(),
      port: REDIS_PORT(),
      // url: REDIS_URL(),
      retryAttempts: Infinity,
      retryDelay: 5000,
      password: REDIS_PASSWORD(),
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
