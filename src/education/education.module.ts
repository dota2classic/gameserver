import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlayerEducationLockEntity } from 'gameserver/model/player-education-lock.entity';
import { UpdateEducationLockHandler } from 'gameserver/command/UpdateEducationLock/update-education-lock.handler';
import { CheckFirstGameHandler } from 'gameserver/command/CheckFirstGame/check-first-game.handler';
import { EducationLockService } from './education-lock.service';
import { PlayerEducationController } from './player-education.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([PlayerEducationLockEntity]),
  ],
  controllers: [PlayerEducationController],
  providers: [
    EducationLockService,
    UpdateEducationLockHandler,
    CheckFirstGameHandler,
  ],
  exports: [EducationLockService],
})
export class EducationModule {}
