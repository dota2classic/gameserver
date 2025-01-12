import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { ApiProperty } from '@nestjs/swagger';
import { Dota_Map } from 'gateway/shared-types/dota-map';

export class GameServerDto {
  url: string;
  version: Dota2Version;
}

export class MatchInfoDto {
  @ApiProperty({ enum: MatchmakingMode, enumName: "MatchmakingMode" })
  public readonly mode: MatchmakingMode;
  public readonly roomId: string;
  public readonly radiant: string[];
  public readonly dire: string[];
  public readonly averageMMR: number;
  public readonly version: Dota2Version;
}

export class GameSessionDto {
  url: string;
  matchId: number;
  info: MatchInfoDto;
}

export class MatchmakingModeInfoDto {
  @ApiProperty({ enum: MatchmakingMode, enumName: "MatchmakingMode" })
  lobby_type: MatchmakingMode;

  @ApiProperty({ enum: Dota_GameMode, enumName: "Dota_GameMode" })
  game_mode: Dota_GameMode;

  @ApiProperty({ enum: Dota_Map, enumName: "Dota_Map" })
  dota_map: Dota_Map;

  enabled: boolean;
}

export class UpdateGamemodeDto {
  enabled: boolean;
  @ApiProperty({ enum: Dota_GameMode, enumName: "Dota_GameMode" })
  game_mode: Dota_GameMode;

  @ApiProperty({ enum: Dota_Map, enumName: "Dota_Map" })
  dota_map: Dota_Map;
}
