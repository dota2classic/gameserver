import { Module } from '@nestjs/common';
import { AppService } from 'app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { isDev, REDIS_PASSWORD, REDIS_URL } from 'env';
import { GameServerDomain } from 'gameserver';
import { CoreController } from 'core.controller';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { devDbConfig, Entities, prodDbConfig } from 'util/typeorm-config';
import { QueryController } from 'query.controller';
import { MatchController } from 'rest/match.controller';
import { Mapper } from 'rest/mapper';
import { PlayerController } from 'rest/player.controller';
import { InfoController } from 'rest/info.controller';
import { PlayerService } from 'rest/service/player.service';

@Module({
  imports: [
    CqrsModule,
    TypeOrmModule.forRoot(
      (isDev ? devDbConfig : prodDbConfig) as TypeOrmModuleOptions,
    ),
    TypeOrmModule.forFeature(Entities),
    ClientsModule.register([
      {
        name: 'QueryCore',
        transport: Transport.REDIS,
        options: {
          url: REDIS_URL(),
          retryAttempts: Infinity,
          password: REDIS_PASSWORD(),
          retryDelay: 5000,
        },
      },
    ]),
  ],
  controllers: [
    CoreController,
    QueryController,
    MatchController,
    PlayerController,
    InfoController
  ],
  providers: [AppService, PlayerService, Mapper, ...GameServerDomain],
})
export class AppModule {}
