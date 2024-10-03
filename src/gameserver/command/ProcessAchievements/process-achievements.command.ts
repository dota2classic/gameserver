import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class ProcessAchievementsCommand {
  constructor(
    public readonly matchId: number,
    public readonly matchmakingMode: MatchmakingMode,
  ) {}
}
