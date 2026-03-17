import { EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { GameSessionCreatedEvent } from "gateway/events/game-session-created.event";
import { GameSessionService } from "gameserver/service/game-session.service";

@EventsHandler(GameSessionCreatedEvent)
export class GameSessionCreatedHandler implements IEventHandler<GameSessionCreatedEvent> {
  constructor(
    private readonly sessionService: GameSessionService
  ) {}

  async handle(event: GameSessionCreatedEvent) {
    await this.sessionService.createdSession(event.matchId);
  }
}
