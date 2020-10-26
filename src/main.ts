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
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  await wait(500);
  ebus.publish(new DiscoveryRequestedEvent(Math.random()));
}
bootstrap();
