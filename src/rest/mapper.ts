import { Injectable } from '@nestjs/common';
import Match from 'gameserver/entity/Match';
import { MatchDto, PlayerInMatchDto } from 'rest/dto/match.dto';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { LeaderboardEntryDto } from 'rest/dto/player.dto';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { GameServerDto, GameSessionDto } from 'rest/dto/info.dto';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { DotaTeam } from 'gateway/shared-types/dota-team';

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
    winner: match.radiant_win ? 2 : 3,
    duration: match.duration,
    timestamp: match.timestamp,
  });

  public mapLeaderboardEntry = (it: VersionPlayer): LeaderboardEntryDto => ({
    steam_id: it.steam_id,
    mmr: it.mmr,
  });

  public mapGameServer = (it: GameServerModel): GameServerDto => ({
    url: it.url,
    version: it.version,
  });

  public mapGameSession = (it: GameServerSessionModel): GameSessionDto => ({
    url: it.url,
    matchId: it.matchId,
    info: {
      ...it.matchInfoJson,
      averageMMR: 0,
      radiant: it.matchInfoJson.players.filter(it => it.team == DotaTeam.RADIANT).map(t => t.playerId.value),
      dire: it.matchInfoJson.players.filter(it => it.team == DotaTeam.DIRE).map(t => t.playerId.value),
    },
  });
}
