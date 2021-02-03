import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerReportStatus } from 'gameserver/model/player-report-status';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchRecordedEvent } from 'gameserver/event/match-recorded.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { FREE_REPORT_PER_GAMES, GAMES_TO_ADD_REPORT } from 'gateway/shared-types/timings';

@EventsHandler(MatchRecordedEvent)
export class PlayerReportUpdatedHandler
  implements IEventHandler<MatchRecordedEvent> {
  constructor(
    @InjectRepository(PlayerReportStatus)
    private readonly playerReportRepository: Repository<PlayerReportStatus>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
  ) {}

  async handle(event: MatchRecordedEvent) {
    // we only count good games
    if (
      event.type !== MatchmakingMode.RANKED &&
      event.type !== MatchmakingMode.UNRANKED
    )
      return;

    for (let i = 0; i < event.players.length; i++) {
      const p = event.players[i];
      let r = await this.playerReportRepository.findOne({
        steam_id: p.steam_id,
      });

      if (!r) {
        r = new PlayerReportStatus();
        r.steam_id = p.steam_id;
        r.updatedWithMatch = event.matchId;
        await this.playerReportRepository.save(r);
        continue;
      }

      const gamesSinceLast = await this.playerInMatchRepository
        .createQueryBuilder('pim')
        .innerJoin('pim.match', 'm')
        .where('m.id > :last_id', { last_id: r.updatedWithMatch || Number.MAX_SAFE_INTEGER })
        .andWhere('m.type in (:...modes)', {
          modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
        })
        .getCount();

      if (gamesSinceLast >= GAMES_TO_ADD_REPORT) {
        r.reports += FREE_REPORT_PER_GAMES;
        await this.playerReportRepository.save(r);
      }
    }
  }
}
