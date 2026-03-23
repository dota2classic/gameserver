import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { ItemView } from 'gameserver/model/item.view';
import { MetaService } from 'rest/meta/meta.service';
import { MetaMapper } from 'rest/meta/meta.mapper';
import { MetaController } from 'rest/meta/meta.controller';
import { RecordService } from 'rest/service/record.service';
import { RecordController } from 'rest/record.controller';
import { Mapper } from 'rest/mapper';
import { AchievementModule } from 'achievement/achievement.module';
import { MatchModule } from 'match/match.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinishedMatchEntity,
      PlayerInMatchEntity,
      ItemHeroView,
      ItemView,
    ]),
    AchievementModule,
    MatchModule,
  ],
  controllers: [MetaController, RecordController],
  providers: [MetaService, MetaMapper, RecordService, Mapper],
  exports: [MetaMapper],
})
export class MetaModule {}
