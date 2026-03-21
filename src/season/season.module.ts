import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { InfoService } from 'rest/info/info.service';
import { InfoMapper } from 'rest/info/info.mapper';
import { InfoController } from 'rest/info/info.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      GameSeasonEntity,
      MatchmakingModeMappingEntity,
      GameServerSessionEntity,
    ]),
  ],
  controllers: [InfoController],
  providers: [GameSeasonService, InfoService, InfoMapper],
  exports: [GameSeasonService],
})
export class SeasonModule {}
