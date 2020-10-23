import { Module } from '@nestjs/common';
import { AppService } from 'app.service';
import { CqrsModule } from '@nestjs/cqrs';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { isDev, REDIS_URL } from 'env';
import { GameServerDomain } from 'gameserver';
import { CoreController } from 'core.controller';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { devDbConfig, Entities, prodDbConfig } from 'util/typeorm-config';
import { QueryController } from 'query.controller';

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
          retryAttempts: 10,
          retryDelay: 5000,
        },
      },
    ]),
  ],
  controllers: [CoreController, QueryController],
  providers: [AppService, ...GameServerDomain],
})
export class AppModule {}
