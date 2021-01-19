import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerNotRespondingEvent } from 'gameserver/event/server-not-responding.event';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(ServerNotRespondingEvent)
export class ServerNotRespondingHandler
  implements IEventHandler<ServerNotRespondingEvent> {
  constructor(
    @InjectRepository(GameServerModel)
    private readonly gameServerModelRepository: Repository<GameServerModel>,
  ) {}

  async handle(event: ServerNotRespondingEvent) {
    const s = await this.gameServerModelRepository.findOne({
      url: event.url,
    });

    if (s) {
      await this.gameServerModelRepository.delete(s);
    }
  }
}
