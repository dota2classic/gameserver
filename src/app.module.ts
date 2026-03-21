import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TypeOrmModuleOptions } from '@nestjs/typeorm/dist/interfaces/typeorm-options.interface';
import { Entities } from 'util/typeorm-config';
import { getTypeormConfig } from 'config/typeorm.config';
import configuration from 'config/configuration';
import { MetricsModule } from 'metrics/metrics.module';
import { CoreModule } from 'core/core.module';
import { AppService } from 'app.service';
import { SeasonModule } from 'season/season.module';
import { MatchModule } from 'match/match.module';
import { RankingModule } from 'ranking/ranking.module';
import { ModerationModule } from 'moderation/moderation.module';
import { SessionModule } from 'session/session.module';
import { EducationModule } from 'education/education.module';
import { SocialModule } from 'social/social.module';
import { AchievementModule } from 'achievement/achievement.module';
import { MetaModule } from 'meta/meta.module';
import { PlayerModule } from 'player/player.module';

@Module({
  imports: [
    MetricsModule,
    CoreModule,
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    TypeOrmModule.forRootAsync({
      useFactory(config: ConfigService): TypeOrmModuleOptions {
        return {
          ...getTypeormConfig(config),
          type: 'postgres',
          migrations: ['dist/src/database/migrations/*.*'],
          migrationsRun: true,
          // maxQueryExecutionTime: 50,
          logging: ['error'],
        };
      },
      imports: [],
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature(Entities),
    // Feature modules:
    SeasonModule,
    MatchModule,
    RankingModule,
    ModerationModule,
    SessionModule,
    EducationModule,
    SocialModule,
    AchievementModule,
    MetaModule,
    PlayerModule,
  ],
  providers: [
    AppService, // TODO: extract into dedicated EventBridgeModule
  ],
})
export class AppModule {}
