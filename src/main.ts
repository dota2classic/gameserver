import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandBus, EventBus, EventPublisher, ofType, QueryBus } from '@nestjs/cqrs';
import { REDIS_HOST, REDIS_PASSWORD, REDIS_PORT } from 'env';
import { Transport } from '@nestjs/microservices';
import { inspect } from 'util';
import { Logger } from '@nestjs/common';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';
import { wait } from 'util/wait';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ServerActualizationRequestedEvent } from 'gateway/events/gs/server-actualization-requested.event';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { ServerSessionSyncEvent } from 'gateway/events/gs/server-session-sync.event';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';

export function prepareModels(publisher: EventPublisher) {
  // publisher.mergeClassContext(GameServerModel);
}

async function bootstrap() {
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

  qbus.subscribe(e => {
    qlogger.log(`${inspect(e)}`);
  });

  cbus.pipe(ofType(FindGameServerCommand)).subscribe(e => {
    if (e.constructor.name === MakeSureExistsCommand.name) return;
    clogger.log(
      `${inspect(e)}`,
      // e.__proto__.constructor.name,
    );
  });

  await wait(500);
  ebus.publish(new DiscoveryRequestedEvent(Math.random()));

  // ebus.publish(construct(GameResultsEvent, {
  //   server: 'glory.dota2classic.ru:27045',
  //   radiantWin: false,
  //   matchId: 1696,
  //   type: 1,
  //   duration: 1771,
  //   timestamp: 1604335095,
  //   players: [
  //     {
  //       hero: 'npc_dota_hero_zuus',
  //       gpm: 227,
  //       steam_id: '[U:1:59565811]',
  //       team: 2,
  //       items: [],
  //       denies: 0,
  //       kills: 1,
  //       level: 7,
  //       deaths: 7,
  //       xpm: 88,
  //       assists: 2,
  //       last_hits: 20
  //     },
  //     {
  //       hero: 'npc_dota_hero_rubick',
  //       gpm: 410,
  //       steam_id: '[U:1:1142690681]',
  //       team: 3,
  //       items: [],
  //       denies: 2,
  //       kills: 11,
  //       level: 16,
  //       deaths: 2,
  //       xpm: 435,
  //       assists: 9,
  //       last_hits: 79
  //     },
  //     {
  //       hero: 'npc_dota_hero_venomancer',
  //       gpm: 361,
  //       steam_id: '[U:1:188364579]',
  //       team: 3,
  //       items: [],
  //       denies: 5,
  //       kills: 12,
  //       level: 15,
  //       deaths: 4,
  //       xpm: 380,
  //       assists: 9,
  //       last_hits: 44
  //     },
  //     {
  //       hero: 'npc_dota_hero_jakiro',
  //       gpm: 255,
  //       steam_id: '[U:1:133576155]',
  //       team: 2,
  //       items: [],
  //       denies: 9,
  //       kills: 1,
  //       level: 10,
  //       deaths: 18,
  //       xpm: 178,
  //       assists: 6,
  //       last_hits: 40
  //     },
  //     {
  //       hero: 'npc_dota_hero_pudge',
  //       gpm: 324,
  //       steam_id: '[U:1:1062901073]',
  //       team: 3,
  //       items: [],
  //       denies: 0,
  //       kills: 5,
  //       level: 14,
  //       deaths: 10,
  //       xpm: 315,
  //       assists: 18,
  //       last_hits: 24
  //     },
  //     {
  //       hero: 'npc_dota_hero_furion',
  //       gpm: 602,
  //       steam_id: '[U:1:62825856]',
  //       team: 2,
  //       items: [],
  //       denies: 2,
  //       kills: 8,
  //       level: 19,
  //       deaths: 8,
  //       xpm: 622,
  //       assists: 5,
  //       last_hits: 173
  //     },
  //     {
  //       hero: 'npc_dota_hero_sniper',
  //       gpm: 199,
  //       steam_id: '[U:1:841078205]',
  //       team: 2,
  //       items: [],
  //       denies: 7,
  //       kills: 1,
  //       level: 7,
  //       deaths: 4,
  //       xpm: 92,
  //       assists: 1,
  //       last_hits: 26
  //     },
  //     {
  //       hero: 'npc_dota_hero_invoker',
  //       gpm: 330,
  //       steam_id: '[U:1:144797799]',
  //       team: 2,
  //       items: [],
  //       denies: 9,
  //       kills: 3,
  //       level: 12,
  //       deaths: 10,
  //       xpm: 248,
  //       assists: 8,
  //       last_hits: 64
  //     },
  //     {
  //       hero: 'npc_dota_hero_skeleton_king',
  //       gpm: 511,
  //       steam_id: '[U:1:280443916]',
  //       team: 3,
  //       items: [],
  //       denies: 4,
  //       kills: 5,
  //       level: 18,
  //       deaths: 1,
  //       xpm: 556,
  //       assists: 7,
  //       last_hits: 187
  //     },
  //     {
  //       hero: 'npc_dota_hero_viper',
  //       gpm: 514,
  //       steam_id: '[U:1:148928588]',
  //       team: 3,
  //       items: [],
  //       denies: 7,
  //       kills: 13,
  //       level: 17,
  //       deaths: 2,
  //       xpm: 495,
  //       assists: 10,
  //       last_hits: 128
  //     }
  //   ]
  // }  ))
}
bootstrap();
