import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchInfo } from 'gateway/events/room-ready.event';

export class StartGameServerCommand {
  constructor(
    public readonly matchId: number,
    public readonly url: string,
    public readonly info: MatchInfo
  ) {}
}
