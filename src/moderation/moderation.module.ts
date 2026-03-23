import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { PlayerIpEntity } from 'gameserver/model/player-ip.entity';
import { PlayerFeedbackService } from 'gameserver/service/player-feedback.service';
import { PlayerQualityService } from 'gameserver/service/player-quality.service';
import { CreateCrimeLogHandler } from 'gameserver/command/CreateCrimeLog/create-crime-log.handler';
import { PlayerBanHammeredHandler } from 'gameserver/event-handler/player-ban-hammered.handler';
import { CrimeLogCreatedHandler } from 'gameserver/event-handler/crime-log-created.handler';
import { PlayerReportUpdatedHandler } from 'gameserver/event-handler/player-report-updated.handler';
import { GetReportsAvailableHandler } from 'gameserver/query/get-reports-available.handler';
import { CrimeController } from 'rest/crime/crime.controller';
import { PlayerModerationController } from './player-moderation.controller';
import { ModerationRedisListener } from './moderation-redis.listener';
import { ModerationQueryController } from './moderation-query.controller';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PlayerBanEntity,
      PlayerReportEntity,
      PlayerReportStatusEntity,
      PlayerCrimeLogEntity,
      PlayerIpEntity,
      PlayerInMatchEntity,
    ]),
  ],
  controllers: [
    CrimeController,
    PlayerModerationController,
    ModerationRedisListener,
    ModerationQueryController,
  ],
  providers: [
    PlayerFeedbackService,
    PlayerQualityService,
    CreateCrimeLogHandler,
    PlayerBanHammeredHandler,
    CrimeLogCreatedHandler,
    PlayerReportUpdatedHandler,
    GetReportsAvailableHandler,
  ],
  exports: [PlayerFeedbackService, PlayerQualityService],
})
export class ModerationModule {}
