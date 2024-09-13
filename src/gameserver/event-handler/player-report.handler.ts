import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerReportEvent } from 'gameserver/event/player-report.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerReportedEvent } from 'gateway/events/bans/player-reported.event';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';

@EventsHandler(PlayerReportEvent)
export class PlayerReportHandler implements IEventHandler<PlayerReportEvent> {
  constructor(
    @InjectRepository(PlayerReportStatusEntity)
    private readonly playerReportStatusRepository: Repository<
      PlayerReportStatusEntity
    >,
    @InjectRepository(PlayerReportEntity)
    private readonly playerReportRepository: Repository<PlayerReportEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: PlayerReportEvent) {
    let r = await this.playerReportStatusRepository.findOne({
      where: { steam_id: event.reporter.value, }
    });

    if (!r) {
      r = new PlayerReportStatusEntity();
      r.steam_id = event.reporter.value;
      await this.playerReportStatusRepository.save(r);
    }

    if (r.reports > 0) {
      const pr = new PlayerReportEntity();
      pr.reported = event.reported.value;
      pr.reporter = event.reporter.value;
      pr.matchId = event.matchId;
      pr.text = event.text;

      await this.playerReportRepository.save(pr);

      r.reports--;
      await this.playerReportStatusRepository.save(r);

      this.ebus.publish(
        new PlayerReportedEvent(
          event.reporter,
          event.reported,
          event.matchId,
          pr.id,
        ),
      );
    }
  }
}
