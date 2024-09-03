import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import { Client } from '@nestjs/microservices/external/nats-client.interface';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(ServerStatusEvent)
export class ServerStatusHandler implements IEventHandler<ServerStatusEvent> {
  constructor(
    private client: Client,
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
    >,
  ) {}

  async handle(event: ServerStatusEvent) {
    let existingSession = await this.gameServerSessionModelRepository.findOne({
      where: { url: event.url },
    });

    if (event.running) {
      if (!existingSession) {
        existingSession = new GameServerSessionModel();
      }
      existingSession.url = event.url;
      existingSession.matchId = event.matchId;
      existingSession.matchInfoJson = event.session;
      await this.gameServerSessionModelRepository.save(existingSession);
    } else {
      await this.gameServerSessionModelRepository.remove(existingSession);
    }
  }
}
