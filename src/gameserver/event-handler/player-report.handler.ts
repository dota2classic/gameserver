import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerReportEvent } from 'gameserver/event/player-report.event';
import { PlayerReportStatus } from 'gameserver/model/player-report-status';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerReport } from 'gameserver/model/player-report';
import { PlayerReportedEvent } from 'gateway/events/bans/player-reported.event';

@EventsHandler(PlayerReportEvent)
export class PlayerReportHandler implements IEventHandler<PlayerReportEvent> {
  constructor(
    @InjectRepository(PlayerReportStatus)
    private readonly playerReportStatusRepository: Repository<
      PlayerReportStatus
    >,
    @InjectRepository(PlayerReport)
    private readonly playerReportRepository: Repository<PlayerReport>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: PlayerReportEvent) {
    let r = await this.playerReportStatusRepository.findOne({
      steam_id: event.reporter.value,
    });

    if (!r) {
      r = new PlayerReportStatus();
      r.steam_id = event.reporter.value;
      await this.playerReportStatusRepository.save(r);
    }

    if (r.reports > 0) {
      const pr = new PlayerReport();
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
