import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchPlayer } from 'gateway/events/room-ready.event';
import { Region } from 'gateway/shared-types/region';

export class PrepareGameCommand {
  constructor(
    public readonly lobbyType: MatchmakingMode,
    public readonly roomId: string,
    public readonly players: MatchPlayer[],
    public readonly version: Dota2Version,
    public readonly region: Region
  ) {}
}
