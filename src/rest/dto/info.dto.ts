import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchInfo } from 'gateway/events/room-ready.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerId } from 'gateway/shared-types/player-id';

export class GameServerDto {
  url: string;
  version: Dota2Version;
}


export class MatchInfoDto {
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
  info: MatchInfoDto
}