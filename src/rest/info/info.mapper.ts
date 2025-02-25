import { Injectable } from '@nestjs/common';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { GameSeasonDto, GameServerDto, GameSessionDto, MatchmakingModeInfoDto } from 'rest/dto/info.dto';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@Injectable()
export class InfoMapper {
  public mapGameServer = (it: GameServerEntity): GameServerDto => ({
    url: it.url,
    version: it.version,
  });

  public mapGameSession = (it: GameServerSessionEntity): GameSessionDto => ({
    url: it.url,
    matchId: it.matchId,
    info: {
      mode: it.matchmaking_mode,
      version: Dota2Version.Dota_684,
      roomId: it.roomId,
      averageMMR: 0,
      radiant: it.players
        .filter((it) => it.team == DotaTeam.RADIANT)
        .map((t) => t.steamId),
      dire: it.players
        .filter((it) => it.team == DotaTeam.DIRE)
        .map((t) => t.steamId),
    },
  });

  public mapMatchmakingMode = (
    it: MatchmakingModeMappingEntity,
  ): MatchmakingModeInfoDto => ({
    lobby_type: it.lobbyType,
    game_mode: it.dotaGameMode,
    dota_map: it.dotaMap,
    enabled: it.enabled,
  });

  public mapGameSeason = (it: {
    gs_id: number;
    gs_start_timestamp: Date;
    is_active: boolean;
  }): GameSeasonDto => ({
    id: it.gs_id,
    startTimestamp: it.gs_start_timestamp.toISOString(),
    isActive: it.is_active,
  });
}
