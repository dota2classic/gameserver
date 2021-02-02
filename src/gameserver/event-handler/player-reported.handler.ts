import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerReportedEvent } from 'gateway/events/bans/player-reported.event';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { Repository } from 'typeorm';
import { PlayerReport } from 'gameserver/model/player-report';
import { CRITICAL_REPORT_COUNT_TO_BAN, REPORT_STACK_WINDOW } from 'gateway/shared-types/timings';
import { Logger } from '@nestjs/common';
import { BanReason } from 'gateway/shared-types/ban';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';

@EventsHandler(PlayerReportedEvent)
export class PlayerReportedHandler
  implements IEventHandler<PlayerReportedEvent> {
  private readonly logger = new Logger(PlayerReportedHandler.name);
  constructor(
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
    @InjectRepository(PlayerReport)
    private readonly playerReportRepository: Repository<PlayerReport>,
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: PlayerReportedEvent) {
    const { count } = await this.playerReportRepository
      .createQueryBuilder('pr')
      .where('pr.reported = :reported', { reported: event.reported.value })
      .andWhere("pr.created_at > 'now'::timestamp - :stack::interval", {
        stack: REPORT_STACK_WINDOW,
      })
      .groupBy('pr.reporter')
      .select('count(distinct pr.reporter)')
      .getRawOne();

    if (count >= CRITICAL_REPORT_COUNT_TO_BAN) {
      this.logger.log(
        `${event.reported.value} was reported ${count} times within last ${REPORT_STACK_WINDOW}. Taking care..`,
      );

      const crime = new PlayerCrimeLogEntity();
      crime.steam_id = event.reported.value;
      crime.crime = BanReason.REPORTS;
      crime.handled = false;

      await this.playerCrimeLogEntityRepository.save(crime);

      this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
    }
  }
}
