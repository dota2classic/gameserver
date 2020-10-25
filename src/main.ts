import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { CommandBus, EventBus, EventPublisher, QueryBus } from '@nestjs/cqrs';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { REDIS_URL } from 'env';
import { Transport } from '@nestjs/microservices';
import { inspect } from 'util';
import { Subscriber } from 'rxjs';
import { Logger } from '@nestjs/common';
import { DiscoveryRequestedEvent } from 'gateway/events/discovery-requested.event';
import { wait } from 'util/wait';
import { construct } from 'gateway/util/construct';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';

export function prepareModels(publisher: EventPublisher) {
  publisher.mergeClassContext(GameServerModel);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.connectMicroservice({
    transport: Transport.REDIS,
    options: {
      url: REDIS_URL(),
      retryAttempts: 10,
      retryDelay: 5000,
    },
  });


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

  ebus._subscribe(
    new Subscriber<any>(e => {
      elogger.log(`${inspect(e)}`);
    }),
  );

  qbus._subscribe(
    new Subscriber<any>(e => {
      qlogger.log(`${inspect(e)}`);
    }),
  );



  cbus._subscribe(
    new Subscriber<any>(e => {
      clogger.log(
        `${inspect(e)}`,
        // e.__proto__.constructor.name,
      );
    }),
  );


  // ebus.publish(construct(GameResultsEvent, {
  //     server: 'glory.dota2classic.ru:27045',
  //     radiantWin: false,
  //     matchId: 62,
  //     type: 0,
  //     duration: 6,
  //     timestamp: 1603636676,
  //     players: [
  //       {
  //         hero: 'npc_dota_hero_brewmaster',
  //         gpm: 141,
  //         team: 3,
  //         deaths: 0,
  //         items: [],
  //         denies: 0,
  //         kills: 0,
  //         level: 1,
  //         xpm: 60,
  //         assists: 0,
  //         last_hits: 0
  //       },
  //       {
  //         hero: 'npc_dota_hero_furion',
  //         gpm: 2,
  //         team: 2,
  //         deaths: 2,
  //         items: [],
  //         denies: 1,
  //         kills: 0,
  //         level: 1,
  //         xpm: 0,
  //         assists: 0,
  //         last_hits: 0
  //       }
  //     ]
  //   }
  // ))

  await wait(500)
  ebus.publish(new DiscoveryRequestedEvent(Math.random()))
}
bootstrap();
