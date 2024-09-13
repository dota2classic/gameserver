import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(ServerStatusEvent)
export class ServerStatusHandler implements IEventHandler<ServerStatusEvent> {
  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
    >,
  ) {}

  async handle(event: ServerStatusEvent) {
    let existingSession = await this.gameServerSessionModelRepository.findOne({
      where: { url: event.url },
    });

    console.log('Sever status handler')

    if (event.running) {
      if (!existingSession) {
        existingSession = new GameServerSessionEntity();
      }
      existingSession.url = event.url;
      existingSession.matchId = event.matchId;
      existingSession.matchInfoJson = event.session;
      await this.gameServerSessionModelRepository.save(existingSession);
    } else if(existingSession) { // remove session if it exists
      await this.gameServerSessionModelRepository.remove(existingSession);
    }
  }
}
