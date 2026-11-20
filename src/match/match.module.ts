import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { MatchEntity } from 'gameserver/model/match.entity';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { MatchService } from 'rest/match/match.service';
import { MatchMapper } from 'rest/match/match.mapper';
import { MatchController } from 'rest/match/match.controller';
import { SaveGameResultsHandler } from 'gameserver/command/SaveGameResults/save-game-results.handler';
import { SaveMatchFailedHandler } from 'gameserver/command/SaveMatchFailed/save-match-failed.handler';
import { SavePlayerAbandonHandler } from 'gameserver/command/SavePlayerAbandon/save-player-abandon.handler';
import { AttachReplayHandler } from 'gameserver/command/AttachReplayCommand/attach-replay.handler';
import { MatchFinishedHandler } from 'gameserver/event-handler/match-finished.handler';
import { MatchRmqListener } from './match-rmq.listener';
import { ModerationModule } from 'moderation/moderation.module';
import { SeasonModule } from 'season/season.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinishedMatchEntity,
      PlayerInMatchEntity,
      MmrChangeLogEntity,
      MatchEntity,
      GameServerSessionEntity,
      PlayerCrimeLogEntity,
    ]),
    ModerationModule,
    SeasonModule,
  ],
  controllers: [MatchController, MatchRmqListener],
  providers: [
    MatchService,
    MatchMapper,
    SaveGameResultsHandler,
    SaveMatchFailedHandler,
    SavePlayerAbandonHandler,
    AttachReplayHandler,
    MatchFinishedHandler,
  ],
  exports: [MatchService, MatchMapper],
})
export class MatchModule {}
