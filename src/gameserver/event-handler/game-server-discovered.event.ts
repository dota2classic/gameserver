import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameServerDiscoveredEvent } from 'gateway/events/game-server-discovered.event';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(GameServerDiscoveredEvent)
export class GameServerDiscoveredHandler
  implements IEventHandler<GameServerDiscoveredEvent> {
  constructor(
    private readonly gsRepo: GameServerRepository,
    @InjectRepository(GameServerModel)
    private readonly gameServerModelRepository: Repository<GameServerModel>,
  ) {}

  async handle(event: GameServerDiscoveredEvent) {
    const gs = new GameServerModel();
    gs.url = event.url;
    gs.version = event.version;
    await this.gameServerModelRepository.save(gs);
  }
}
