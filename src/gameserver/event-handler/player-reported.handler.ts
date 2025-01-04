import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerReportedEvent } from 'gateway/events/bans/player-reported.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CRITICAL_REPORT_COUNT_TO_BAN, REPORT_STACK_WINDOW } from 'gateway/shared-types/timings';
import { Logger } from '@nestjs/common';
import { BanReason } from 'gateway/shared-types/ban';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@EventsHandler(PlayerReportedEvent)
export class PlayerReportedHandler
  implements IEventHandler<PlayerReportedEvent>
{
  private readonly logger = new Logger(PlayerReportedHandler.name);
  constructor(
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
    @InjectRepository(PlayerReportEntity)
    private readonly playerReportRepository: Repository<PlayerReportEntity>,
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: PlayerReportedEvent) {
    const countHolder = await this.playerCrimeLogEntityRepository.query(`
    with t as (select 1 as d
           from player_report pr

           where pr.reported = '${event.reported.value}' and pr.created_at > 'now'::timestamp - '${REPORT_STACK_WINDOW}'::interval
           group by pr.reporter)
select count(*)
from t
`);

    const count = Number(countHolder[0].count);
    this.logger.log(
      `${event.reported.value} was reported ${count} times within last ${REPORT_STACK_WINDOW}. To create crime we need: ${CRITICAL_REPORT_COUNT_TO_BAN}`,
    );

    if (count >= CRITICAL_REPORT_COUNT_TO_BAN) {
      const crime = new PlayerCrimeLogEntity(
        event.reported.value,
        BanReason.REPORTS,
        MatchmakingMode.BOTS, // TODO: fetch via event.matchId
        event.matchId,
      );
      crime.steam_id = event.reported.value;
      crime.crime = BanReason.REPORTS;
      crime.handled = false;

      await this.playerCrimeLogEntityRepository.save(crime);

      this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
    }
  }
}
