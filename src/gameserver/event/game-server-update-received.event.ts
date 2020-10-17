import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameState } from 'core.controller';
import { Dota2Version } from 'gateway/shared-types/dota2version';

export class GameServerUpdateReceivedEvent {
  constructor(
    public readonly url: string,
    public readonly state: Dota_GameState,
    public readonly matchId: number,
    public readonly mode: MatchmakingMode,
    public readonly version: Dota2Version
  ) {}
}
