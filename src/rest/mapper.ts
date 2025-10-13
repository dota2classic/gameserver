import { Injectable } from '@nestjs/common';
import { AchievementDto, DBAchievementDto } from 'rest/dto/achievement.dto';
import { AchievementService } from 'gameserver/achievement.service';
import { PlayerRecordDto } from 'rest/dto/record.dto';
import { RecordEntry } from 'rest/service/record.service';
import { DodgeListEntryDto } from 'rest/dto/player.dto';
import { DodgeListEntity } from 'gameserver/model/dodge-list.entity';
import { MatchMapper } from 'rest/match/match.mapper';

@Injectable()
export class Mapper {
  constructor(
    private readonly as: AchievementService,
    private readonly matchMapper: MatchMapper,
  ) {}

  // public mapLeaderboardEntry = (it: VersionPlayer): LeaderboardEntryDto => ({
  //   steam_id: it.steam_id,
  //   mmr: it.mmr,
  // });

  public mapAchievement = (it: DBAchievementDto): AchievementDto => ({
    key: it.achievement_key,
    steamId: it.steam_id,
    progress: it.progress,
    percentile: it.percentile || 0,

    checkpoints:
      this.as.achievementMap.get(it.achievement_key)?.checkpoints || [],
    isComplete:
      this.as.achievementMap.get(it.achievement_key)?.isFullyComplete(it) ||
      false,
    matchId: it.matchId,
  });

  public mapRecordDto = async (it: RecordEntry): Promise<PlayerRecordDto> => {
    return {
      match: it.match && (await this.matchMapper.mapMatch(it.match)),
      steamId: it.steamId,
      recordType: it.type,
    };
  };

  public mapDodgeEntry = (it: DodgeListEntity): DodgeListEntryDto => ({
    steamId: it.dodgedSteamId,
    createdAt: it.createdAt.toISOString(),
  });
}
