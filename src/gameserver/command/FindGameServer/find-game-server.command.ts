import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchInfo } from 'gateway/events/room-ready.event';

export class FindGameServerCommand {
  constructor(
    public readonly matchInfo: MatchInfo,
    public readonly tries: number
  ) {}
}
