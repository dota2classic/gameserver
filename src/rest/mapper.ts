import { Injectable } from '@nestjs/common';
import Match from 'gameserver/entity/Match';
import { MatchDto, PlayerInMatchDto } from 'rest/dto/match.dto';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';

@Injectable()
export class Mapper {
  public mapPlayerInMatch = (it: PlayerInMatch): PlayerInMatchDto => ({
    steam_id: it.playerId,

    team: it.team,
    level: it.level,
    hero: it.hero,

    kills: it.kills,
    deaths: it.deaths,
    assists: it.assists,

    last_hits: it.last_hits,
    denies: it.denies,

    gpm: it.gpm,
    xpm: it.xpm,

    items: it.items.split(','),

    abandoned: it.abandoned,
  });

  public mapMatch = (match: Match): MatchDto => ({
    id: match.id,
    mode: match.type,
    radiant: match.players.filter(t => t.team === 2).map(this.mapPlayerInMatch),
    dire: match.players.filter(t => t.team === 3).map(this.mapPlayerInMatch),
  });
}
