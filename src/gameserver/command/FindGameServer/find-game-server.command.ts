import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerId } from 'gateway/shared-types/player-id';

export class FindGameServerCommand {
  constructor(
    public readonly roomId: string,
    public readonly version: Dota2Version,
    public readonly mode: MatchmakingMode,
    public readonly radiant: PlayerId[],
    public readonly dire: PlayerId[],
    public readonly averageMMR: number,
    public readonly tries: number
  ) {}
}
