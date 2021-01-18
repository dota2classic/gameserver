import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandBus, EventBus, EventPublisher, QueryBus } from '@nestjs/cqrs';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { REDIS_PASSWORD, REDIS_URL } from 'env';
import { Transport } from '@nestjs/microservices';
import { inspect } from 'util';
import { Subscriber } from 'rxjs';
import { Logger } from '@nestjs/common';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';
import { wait } from 'util/wait';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { construct } from 'gateway/util/construct';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';

export function prepareModels(publisher: EventPublisher) {
  // publisher.mergeClassContext(GameServerModel);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: REDIS_URL(),
      retryAttempts: Infinity,
      retryDelay: 5000,
      password: REDIS_PASSWORD()
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

  // ebus._subscribe(
  //   new Subscriber<any>(e => {
  //     elogger.log(`${inspect(e)}`);
  //   }),
  // );
  //
  // qbus._subscribe(
  //   new Subscriber<any>(e => {
  //     qlogger.log(`${inspect(e)}`);
  //   }),
  // );
  //
  // cbus._subscribe(
  //   new Subscriber<any>(e => {
  //     clogger.log(
  //       `${inspect(e)}`,
  //       // e.__proto__.constructor.name,
  //     );
  //   }),
  // );

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
