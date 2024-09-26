import { PlayerInMatchDTO } from 'gateway/events/gs/game-results.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';

export class MatchRecordedEvent {
  constructor(
    public readonly matchId: number,
    public readonly winner: DotaTeam,
    public readonly duration: number,
    public readonly type: MatchmakingMode,
    public readonly gameMode: Dota_GameMode,
    public readonly timestamp: number,
    public readonly server: string,
    public readonly players: PlayerInMatchDTO[],
  ) {}
}
