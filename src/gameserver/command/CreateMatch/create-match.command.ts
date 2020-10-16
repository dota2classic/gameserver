import { MatchInfo } from 'gateway/events/room-ready.event';

export class CreateMatchCommand {
  constructor(
    public readonly url: string,
    public readonly info: MatchInfo
  ) {}
}
