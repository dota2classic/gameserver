import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerEducationLockEntity } from 'gameserver/model/player-education-lock.entity';
import { PlayerService } from 'rest/service/player.service';
import { MakeSureExistsHandler } from 'gameserver/command/MakeSureExists/make-sure-exists.handler';
import { GetPlayerInfoHandler } from 'gameserver/query/get-player-info.handler';
import { PlayerProfileController } from './player-profile.controller';
import { PlayerQueryController } from './player-query.controller';
import { PlayerRedisListener } from './player-redis.listener';
import { RankingModule } from 'ranking/ranking.module';
import { ModerationModule } from 'moderation/moderation.module';
import { SocialModule } from 'social/social.module';
import { SeasonModule } from 'season/season.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerInMatchEntity,
      VersionPlayerEntity,
      PlayerBanEntity,
      PlayerEducationLockEntity,
    ]),
    RankingModule,
    ModerationModule,
    SocialModule,
    SeasonModule,
  ],
  controllers: [PlayerProfileController, PlayerQueryController, PlayerRedisListener],
  providers: [PlayerService, MakeSureExistsHandler, GetPlayerInfoHandler],
})
export class PlayerModule {}
