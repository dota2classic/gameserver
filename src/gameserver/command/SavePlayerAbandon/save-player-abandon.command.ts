import { PlayerAbandonedEvent } from 'gateway/events/bans/player-abandoned.event';

export class SavePlayerAbandonCommand {
  constructor(
    public readonly event: PlayerAbandonedEvent,
    public readonly manual: boolean
  ) {
  }
}
