import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { ServerStatusEvent } from 'gateway/events/gs/server-status.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerStoppedEvent } from 'gateway/events/game-server-stopped.event';
import { Logger } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@EventsHandler(ServerStatusEvent)
export class ServerStatusHandler implements IEventHandler<ServerStatusEvent> {
  private logger = new Logger(ServerStatusHandler.name);
  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: ServerStatusEvent) {
    let existingSession = await this.gameServerSessionModelRepository.findOne({
      where: { url: event.url },
    });

    if (event.running && !existingSession) {
      this.logger.warn(
        "Server is running, but no session: should not be possible i guess?",
      );
    } else if (!event.running && existingSession) {
      // remove session if it exists
      this.logger.log("Game server is stopped!");
      this.ebus.publish(
        new GameServerStoppedEvent(event.url, Dota2Version.Dota_684),
      );
    }
  }
}
