import { otelSDK } from './tracer';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandBus, EventBus, EventPublisher, ofType, QueryBus } from '@nestjs/cqrs';
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
import configuration from 'config/configuration';
import { ConfigService } from '@nestjs/config';

import { types } from 'pg';
import { WinstonWrapper } from '@dota2classic/nest_logger';
import { GameServerService } from 'gameserver/gameserver.service';

types.setTypeParser(types.builtins.NUMERIC, (value: string): number =>
  parseFloat(value),
);

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
      config.get<string>("fluentbit.application"),
      config.get<boolean>("fluentbit.disabled"),
    ),
  });

  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      username: "default",
      host: config.get("redis.host"),
      port: 6379,
      retryAttempts: Infinity,
      retryDelay: 5000,
      password: config.get("redis.password"),
    },
  });

  const options = new DocumentBuilder()
    .setTitle("GameServer api")
    .setDescription("Matches, players, mmrs")
    .setVersion("1.0")
    .addTag("game")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("api", app, document);

  await app.listen(5003);

  await app.startAllMicroservices();

  const publisher = app.get(EventPublisher);
  prepareModels(publisher);

  const ebus = app.get(EventBus);
  const cbus = app.get(CommandBus);
  const qbus = app.get(QueryBus);

  const clogger = new Logger("CommandLogger");
  const elogger = new Logger("EventLogger");
  const qlogger = new Logger("EventLogger");

  ebus.subscribe((e) => {
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

  cbus.pipe(ofType(FindGameServerCommand)).subscribe((e) => {
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

  // const r1 = async () =>
  //   (await app.get(RecordService).getMostKda()).map((it) => it.match.id);
  // console.log(await r1());
  //
  // console.log(await r1());

  for (let i = 0; i < 1; i++) {
    await app.get(GameServerService).generateFakeMatch("116514945");
  }

  // await app.get(PlayerQualityService).onPlayerIpUpdated('1852498426')
}
bootstrap();
