import { MatchInfo } from 'gateway/events/room-ready.event';

export class FindGameServerCommand {
  constructor(
    public readonly matchInfo: MatchInfo,
    public readonly tries: number
  ) {}
}
