import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';

export class SaveGameServerNotFoundCommand {
  constructor(public readonly event: GameServerNotFoundEvent) {}
}
