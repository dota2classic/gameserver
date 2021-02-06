import { GameResultsEvent, PlayerInMatchDTO } from 'gateway/events/gs/game-results.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class MatchRecordedEvent {
  constructor(
    public readonly matchId: number,
    public readonly radiantWin: boolean,
    public readonly duration: number,
    public readonly type: MatchmakingMode,
    public readonly timestamp: number,
    public readonly server: string,
    public readonly players: PlayerInMatchDTO[],
  ) {}
}
