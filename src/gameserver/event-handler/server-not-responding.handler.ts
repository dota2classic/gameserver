import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerNotRespondingEvent } from 'gameserver/event/server-not-responding.event';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(ServerNotRespondingEvent)
export class ServerNotRespondingHandler
  implements IEventHandler<ServerNotRespondingEvent> {
  constructor(
    @InjectRepository(GameServerEntity)
    private readonly gameServerModelRepository: Repository<GameServerEntity>,
  ) {}

  async handle(event: ServerNotRespondingEvent) {
    const s = await this.gameServerModelRepository.findOne({
      where: { url: event.url, }
    });

    if (s) {
      await this.gameServerModelRepository.delete(s);
    }
  }
}
