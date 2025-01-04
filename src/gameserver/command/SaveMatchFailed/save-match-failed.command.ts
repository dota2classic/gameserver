import { MatchFailedEvent } from 'gateway/events/match-failed.event';

export class SaveMatchFailedCommand {
  constructor(
    public readonly event: MatchFailedEvent
  ) {
  }
}
