import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchPlayer } from 'gateway/events/room-ready.event';

export class PrepareGameCommand {
  constructor(
    public readonly lobbyType: MatchmakingMode,
    public readonly roomId: string,
    public readonly players: MatchPlayer[],
    public readonly version: Dota2Version,
  ) {}
}
