import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class UpdateGameServerCommand {
  constructor(
    public readonly url: string,
    public readonly version: Dota2Version,
    public readonly mode: MatchmakingMode,
    public readonly matchId: number,
    public readonly running: boolean,
  ) {}
}
