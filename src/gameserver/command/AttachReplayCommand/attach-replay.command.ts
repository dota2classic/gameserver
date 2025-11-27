import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class AttachReplayCommand {
  constructor(
    public readonly matchId: number,
    public readonly mode: MatchmakingMode,
    public readonly key: string
  ) {
  }
}
