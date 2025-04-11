import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { FREE_REPORT_PER_GAMES, GAMES_TO_ADD_REPORT, MAX_REPORTS_AVAILABLE } from 'gateway/shared-types/timings';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { Logger } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { MatchRecordedEvent } from 'gateway/events/gs/match-recorded.event';

@EventsHandler(MatchRecordedEvent)
export class PlayerReportUpdatedHandler
  implements IEventHandler<MatchRecordedEvent>
{
  private logger = new Logger(PlayerReportUpdatedHandler.name);

  constructor(
    @InjectRepository(PlayerReportStatusEntity)
    private readonly playerReportRepository: Repository<PlayerReportStatusEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
  ) {}

  async handle(event: MatchRecordedEvent) {
    // we only count good games
    if (
      event.type !== MatchmakingMode.RANKED &&
      event.type !== MatchmakingMode.UNRANKED
    )
      return;

    for (let p of event.players) {
      let r = await this.playerReportRepository.findOne({
        where: { steam_id: p.steam_id },
      });

      if (!r) {
        r = new PlayerReportStatusEntity();
        r.steam_id = p.steam_id;
        r.updated_with_match_id = event.matchId;
        await this.playerReportRepository.save(r);
        continue;
      }

      if (!r.updated_with_match_id) {
        r.updated_with_match_id = event.matchId;
        await this.playerReportRepository.save(r);
        continue;
      }

      if(!r.updated_with_match_id) return;

      const gamesSinceLast = await this.playerInMatchRepository
        .createQueryBuilder("pim")
        .innerJoin("pim.match", "m")
        .leftJoin(FinishedMatchEntity, "lsm", 'lsm.id = :id', { id: r.updated_with_match_id })
        .where("m.timestamp > lsm.timestamp")
        .andWhere(`pim."playerId" = :pid`, { pid: p.steam_id })
        .andWhere("m.matchmaking_mode in (:...modes)", {
          modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
        })
        .getCount();

      if (gamesSinceLast >= GAMES_TO_ADD_REPORT) {
        r.reports += FREE_REPORT_PER_GAMES;
        r.reports = Math.min(r.reports, MAX_REPORTS_AVAILABLE);
        r.updated_with_match_id = event.matchId;
        this.logger.log("Game threshold for adding reports: " + r.reports)
        await this.playerReportRepository.save(r);
      }
    }
  }
}
