import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { RecalibrationEntity } from 'gameserver/model/recalibration.entity';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { MmrBucketView } from 'gameserver/model/mmr-bucket.view';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { PlayerEducationLockEntity } from 'gameserver/model/player-education-lock.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { LeaderboardService } from 'gameserver/service/leaderboard.service';
import { StartingMmrService } from 'gameserver/service/starting-mmr.service';
import { MmrBucketService } from 'gameserver/mmr-bucket.service';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { PlayerNotLoadedHandler } from 'gameserver/event-handler/player-not-loaded.handler';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { MatchEntity } from 'gameserver/model/match.entity';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerRankingController } from './player-ranking.controller';
import { LeaderboardRefreshScheduler } from './leaderboard-refresh.scheduler';
import { SeasonModule } from 'season/season.module';
import { EducationModule } from 'education/education.module';
import { ModerationModule } from 'moderation/moderation.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      VersionPlayerEntity,
      MmrChangeLogEntity,
      RecalibrationEntity,
      LeaderboardView,
      MmrBucketView,
      GameServerSessionEntity,
      GameSessionPlayerEntity,
      PlayerInMatchEntity,
      FinishedMatchEntity,
      PlayerEducationLockEntity,
      GameSeasonEntity,
      PlayerBanEntity,
      PlayerCrimeLogEntity,
      MatchEntity,
      ItemHeroView,
    ]),
    SeasonModule,
    EducationModule,
    ModerationModule,
  ],
  controllers: [PlayerRankingController],
  providers: [
    LeaderboardService,
    StartingMmrService,
    MmrBucketService,
    PlayerServiceV2,
    GameServerService,
    ProcessRankedMatchHandler,
    PlayerNotLoadedHandler,
    LeaderboardRefreshScheduler,
  ],
  exports: [LeaderboardService, PlayerServiceV2, StartingMmrService, GameServerService],
})
export class RankingModule {}
