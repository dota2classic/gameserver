import { BanReason } from 'gateway/shared-types/ban';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class CreateCrimeLogCommand {
  constructor(
    public readonly steamId: string,
    public readonly reason: BanReason,
    public readonly mode: MatchmakingMode,
    public readonly matchId?: number
  ) {
  }
}
