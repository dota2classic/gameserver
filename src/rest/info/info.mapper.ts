import { Injectable } from '@nestjs/common';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { GameServerDto, GameSessionDto, MatchmakingModeInfoDto } from 'rest/dto/info.dto';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';

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
      mode: it.matchInfoJson.mode,
      version: it.matchInfoJson.version,
      roomId: it.matchInfoJson.roomId,
      averageMMR: 0,
      radiant: it.matchInfoJson.players
        .filter((it) => it.team == DotaTeam.RADIANT)
        .map((t) => t.playerId.value),
      dire: it.matchInfoJson.players
        .filter((it) => it.team == DotaTeam.DIRE)
        .map((t) => t.playerId.value),
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
}
