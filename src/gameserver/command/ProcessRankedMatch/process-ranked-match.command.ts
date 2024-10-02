import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class ProcessRankedMatchCommand {
  constructor(
    public readonly matchId: number,
    public readonly winners: PlayerId[],
    public readonly losers: PlayerId[],
    public readonly mode: MatchmakingMode
  ) {}
}
