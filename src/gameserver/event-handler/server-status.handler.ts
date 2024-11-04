import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { Logger } from '@nestjs/common';

@EventsHandler(ServerStatusEvent)
export class ServerStatusHandler implements IEventHandler<ServerStatusEvent> {
  private logger = new Logger(ServerStatusHandler.name)
  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: ServerStatusEvent) {
    let existingSession = await this.gameServerSessionModelRepository.findOne({
      where: { url: event.url },
    });

    if (event.running && !existingSession) {
      this.logger.warn(`Needed to create game server session for url ${event.url}`)
      // Server is running with session and we don't know it for some reason
      existingSession = new GameServerSessionEntity();
      existingSession.url = event.url;
      existingSession.matchId = event.matchId;
      existingSession.matchInfoJson = event.session;
      await this.gameServerSessionModelRepository.save(existingSession);
    } else if (!event.running && existingSession) {
      // remove session if it exists
      await this.gameServerSessionModelRepository.remove(existingSession);
      this.ebus.publish(
        new GameServerStoppedEvent(event.url, existingSession.matchInfoJson.version),
      );
    }
  }
}
