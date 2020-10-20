import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerModel } from 'gameserver/model/game-server.model';

@EventsHandler(GameServerDiscoveredEvent)
export class GameServerDiscoveredHandler
  implements IEventHandler<GameServerDiscoveredEvent> {
  constructor(private readonly gsRepo: GameServerRepository) {}

  async handle(event: GameServerDiscoveredEvent) {
    const gs = new GameServerModel(event.url, event.version);
    await this.gsRepo.save(gs.url, gs);
  }
}
