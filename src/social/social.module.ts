import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DodgeListEntity } from 'gameserver/model/dodge-list.entity';
import { DodgeService } from 'rest/service/dodge.service';
import { PlayerSocialController } from './player-social.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DodgeListEntity])],
  controllers: [PlayerSocialController],
  providers: [DodgeService],
  exports: [DodgeService],
})
export class SocialModule {}
