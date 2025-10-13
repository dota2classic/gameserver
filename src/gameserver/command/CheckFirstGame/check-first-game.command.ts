import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class CheckFirstGameCommand {
  constructor(
    public readonly matchId: number,
    public readonly lobbyType: MatchmakingMode,
    public readonly players: string[]
  ) {
  }
}
