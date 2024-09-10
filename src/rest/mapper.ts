import { Injectable } from '@nestjs/common';
import { MatchDto, PlayerInMatchDto } from 'rest/dto/match.dto';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { LeaderboardEntryDto } from 'rest/dto/player.dto';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { GameServerDto, GameSessionDto } from 'rest/dto/info.dto';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import FinishedMatch from 'gameserver/entity/finished-match';

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

    gold: it.gold,

    gpm: it.gpm,
    xpm: it.xpm,

    item0: it.item0,
    item1: it.item1,
    item2: it.item2,
    item3: it.item3,
    item4: it.item4,
    item5: it.item5,

    abandoned: it.abandoned,
  });

  public mapMatch = (match: FinishedMatch): MatchDto => ({
    id: match.id,
    mode: match.matchmaking_mode,
    game_mode: match.game_mode,
    radiant: match.players.filter(t => t.team === DotaTeam.RADIANT).map(this.mapPlayerInMatch),
    dire: match.players.filter(t => t.team === DotaTeam.DIRE).map(this.mapPlayerInMatch),
    winner: match.winner,
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
      mode: it.matchInfoJson.mode,
      version: it.matchInfoJson.version,
      roomId: it.matchInfoJson.roomId,
      averageMMR: 0,
      radiant: it.matchInfoJson.players.filter(it => it.team == DotaTeam.RADIANT).map(t => t.playerId.value),
      dire: it.matchInfoJson.players.filter(it => it.team == DotaTeam.DIRE).map(t => t.playerId.value),
    },
  });
}
