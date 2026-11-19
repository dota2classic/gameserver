// import { otelSDK } from './tracer';

import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { EventPublisher } from "@nestjs/cqrs";
import { RedisOptions } from "@nestjs/microservices";
import { INestApplication } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import "./util/promise";
import configuration from "config/configuration";
import { getRedisTransportOptions } from "config/redis.config";
import { ConfigService } from "@nestjs/config";
import fastify from "fastify";
import { types } from "pg";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";

require('dotenv').config()

types.setTypeParser(types.builtins.NUMERIC, (value: string): number =>
  parseFloat(value),
);

export function prepareModels(publisher: EventPublisher) {
  // publisher.mergeClassContext(GameServerModel);
}

async function bootstrap() {
  // await otelSDK.start();

  const parsedConfig = configuration();
  const config = new ConfigService(parsedConfig);

  const app = (await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(
      fastify({
        trustProxy: true,
        bodyLimit: 1024 * 1024 * 20, // 20 MB
      }),
    ),
    {
      // logger: new WinstonWrapper(
      //   config.get("fluentbit.host"),
      //   config.get<number>("fluentbit.port"),
      //   config.get<string>("fluentbit.application"),
      //   config.get<boolean>("fluentbit.disabled"),
      // ),
    },
  )) as INestApplication<AppModule>;

  app.connectMicroservice<RedisOptions>(getRedisTransportOptions(config));

  // app.use(compression());

  const options = new DocumentBuilder()
    .setTitle("GameServer api")
    .setDescription("Matches, players, mmrs")
    .setVersion("1.0")
    .addTag("game")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, options);
  SwaggerModule.setup("api", app, document);

  await app.listen(5003, "0.0.0.0");

  await app.startAllMicroservices();
  // for (let i = 0; i < 1; i++) {
  //   await app.get(GameServerService).generateFakeMatch("116514945");
  // }

  // await app.get(PlayerQualityService).onPlayerIpUpdated('1852498426')
}
bootstrap();
