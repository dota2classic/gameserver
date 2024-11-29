import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { MatchDto, MmrChangeDto, PlayerInMatchDto } from 'rest/dto/match.dto';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MatchMapper {
  public mapMatch = (match: FinishedMatchEntity): MatchDto => ({
    id: match.id,
    mode: match.matchmaking_mode,
    game_mode: match.game_mode,
    radiant: match.players
      .filter((t) => t.team === DotaTeam.RADIANT)
      .map(this.mapPlayerInMatch),
    dire: match.players
      .filter((t) => t.team === DotaTeam.DIRE)
      .map(this.mapPlayerInMatch),
    winner: match.winner,
    duration: match.duration,
    timestamp: match.timestamp,
  });

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

    mmr: it.mmrChange?.length > 0 ? this.mapMmr(it.mmrChange[0]) : null,
    abandoned: it.abandoned,
  });

  public mapMmr = (mmr: MmrChangeLogEntity): MmrChangeDto => ({
    mmr_before: mmr.mmrBefore,
    mmr_after: mmr.mmrAfter,
    change: mmr.change,
    is_hidden: mmr.hiddenMmr,
  });
}
