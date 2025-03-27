import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerReportStateUpdatedEvent } from 'gameserver/event/player-report-state-updated.event';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(PlayerReportStateUpdatedEvent)
export class PlayerReportStateUpdatedHandler implements IEventHandler<PlayerReportStateUpdatedEvent> {
  constructor(
    @InjectRepository(PlayerReportEntity)
    private readonly playerReportEntityRepository: Repository<PlayerReportEntity>,
  ) {}

  async handle(event: PlayerReportStateUpdatedEvent) {
    const reports = await this.playerReportEntityRepository.find({
      where: {
        reportedSteamId: event.steamId
      }
    });

  }
}
