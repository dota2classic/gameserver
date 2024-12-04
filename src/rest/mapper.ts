import { Injectable } from '@nestjs/common';
import { MatchDto, MmrChangeDto, PlayerInMatchDto } from 'rest/dto/match.dto';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { AchievementDto } from 'rest/dto/achievement.dto';
import { AchievementService } from 'gameserver/achievement.service';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';

@Injectable()
export class Mapper {
  constructor(private readonly as: AchievementService) {}
  public mapPlayerInMatch = (it: PlayerInMatchEntity): PlayerInMatchDto => ({
    steam_id: it.playerId,

    team: it.team,
    level: it.level,
    hero: it.hero,

    kills: it.kills,
    deaths: it.deaths,
    assists: it.assists,

    last_hits: it.last_hits,
    denies: it.denies,

    gold: it.gold,

    gpm: it.gpm,
    xpm: it.xpm,
    hero_damage: it.hero_damage,
    hero_healing: it.hero_healing,
    tower_damage: it.tower_damage,

    item0: it.item0,
    item1: it.item1,
    item2: it.item2,
    item3: it.item3,
    item4: it.item4,
    item5: it.item5,

    mmr: it.mmrChange?.length && this.mapMmr(it.mmrChange[0]),
    abandoned: it.abandoned,
  });

  public mapMmr = (mmr: MmrChangeLogEntity): MmrChangeDto => ({
    mmr_before: mmr.mmrBefore,
    mmr_after: mmr.mmrAfter,
    change: mmr.change,
    is_hidden: mmr.hiddenMmr,
  });

  public mapMatch = (match: FinishedMatchEntity): MatchDto => ({
    id: match.id,
    mode: match.matchmaking_mode,
    game_mode: match.game_mode,
    radiant: match.players
      .filter(t => t.team === DotaTeam.RADIANT)
      .map(this.mapPlayerInMatch),
    dire: match.players
      .filter(t => t.team === DotaTeam.DIRE)
      .map(this.mapPlayerInMatch),
    winner: match.winner,
    duration: match.duration,
    timestamp: match.timestamp,
  });

  // public mapLeaderboardEntry = (it: VersionPlayer): LeaderboardEntryDto => ({
  //   steam_id: it.steam_id,
  //   mmr: it.mmr,
  // });



  public mapAchievement = (it: AchievementEntity): AchievementDto => ({
    key: it.achievement_key,
    steamId: it.steam_id,
    progress: it.progress,
    maxProgress: this.as.getMaxProgressForKey(it.achievement_key),
    isComplete: this.as.achievementMap.get(it.achievement_key).isComplete(it),
    match: it.match ? this.mapMatch(it.match) : undefined,
  });
}
