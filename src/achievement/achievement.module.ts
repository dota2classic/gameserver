import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementService } from 'gameserver/achievement.service';
import { ProcessAchievementsHandler } from 'gameserver/command/ProcessAchievements/process-achievements.handler';
import { GameserverSaga } from 'gameserver/saga/gameserver.saga';
import { PlayerAchievementsController } from './player-achievements.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([AchievementEntity, PlayerInMatchEntity, FinishedMatchEntity]),
  ],
  controllers: [PlayerAchievementsController],
  providers: [AchievementService, ProcessAchievementsHandler, GameserverSaga],
  exports: [AchievementService],
})
export class AchievementModule {}
