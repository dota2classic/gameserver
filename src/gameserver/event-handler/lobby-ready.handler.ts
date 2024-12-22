import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LobbyReadyEvent } from 'gateway/events/lobby-ready.event';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';

@EventsHandler(LobbyReadyEvent)
export class LobbyReadyHandler implements IEventHandler<LobbyReadyEvent> {
  constructor(private readonly ebus: EventBus) {}

  async handle(event: LobbyReadyEvent) {
    this.ebus.publish(
      new GamePreparedEvent(
        event.mode,
        event.gameMode,
        event.map,
        event.version,
        event.roomId,
        event.players,
      ),
    );
  }
}
