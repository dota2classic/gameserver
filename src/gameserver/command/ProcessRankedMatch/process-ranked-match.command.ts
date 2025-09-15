import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class ProcessRankedMatchCommand {
  constructor(
    public readonly matchId: number,
    public readonly winners: string[],
    public readonly losers: string[],
    public readonly mode: MatchmakingMode,
  ) {}
}
