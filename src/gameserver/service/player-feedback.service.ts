import { Injectable, Logger } from '@nestjs/common';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { EventBus } from '@nestjs/cqrs';
import { PlayerReportStateUpdatedEvent } from 'gameserver/event/player-report-state-updated.event';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { PlayerReportsDto } from 'rest/dto/player.dto';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { PlayerFeedbackCreatedEvent } from 'gateway/events/player-feedback-created.event';

@Injectable()
export class PlayerFeedbackService {
  private logger = new Logger(PlayerFeedbackService.name);

  constructor(
    @InjectRepository(PlayerReportEntity)
    private readonly playerReportEntityRepository: Repository<PlayerReportEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(PlayerReportStatusEntity)
    private readonly playerReportStatusEntityRepository: Repository<PlayerReportStatusEntity>,
    private readonly ds: DataSource,
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
  ) {}

  public async getPlayerReportState(
    steamId: string,
  ): Promise<PlayerReportsDto> {
    const some = await this.ds
      .createQueryBuilder()
      .select("pr.chosen_aspect, count(*)::int")
      .from(PlayerReportEntity, "pr")
      .where("pr.reported_steam_id = :steamId", { steamId })
      .groupBy("pr.aspect")
      .getRawMany<{ chosen_aspect: PlayerAspect; count: number }>();

    const playerAspects = Object.keys(PlayerAspect)
      .filter((key) => isNaN(Number(key)))
      .map((aspect) => ({
        aspect: PlayerAspect[aspect],
        count:
          some.find((t) => t.chosen_aspect === PlayerAspect[aspect])?.count ||
          0,
      }));
    return {
      steamId,
      playerAspects: playerAspects,
    };
  }

  public async handlePlayerReport(
    reporter: string,
    reported: string,
    aspect: PlayerAspect,
    matchId: number,
  ) {
    const prs = await this.playerReportStatusEntityRepository.findOneOrFail({
      where: {
        steam_id: reporter,
      },
    });

    if (prs.reports <= 0) {
      throw "No reports";
    }

    await this.ds.transaction(async (tx) => {
      await tx.save(PlayerReportEntity, {
        reporterSteamId: reporter,
        reportedSteamId: reported,
        aspect: aspect,
        matchId,
      });
      await tx.update(
        PlayerReportStatusEntity,
        {
          steam_id: reporter,
        },
        {
          reports: () => "reports - 1",
        },
      );
    });

    this.ebus.publish(new PlayerReportStateUpdatedEvent(reported));
    await this.ebus.publish(
      new PlayerFeedbackCreatedEvent(reported, aspect, matchId),
    );

    return this.playerReportStatusEntityRepository.findOneOrFail({
      where: {
        steam_id: reporter,
      },
    });
  }

  public async getReportMatrix(matchId: number, steamId: string) {
    return await this.ds.query<
      { reported_steam_id: string; match_date: string; reporters: string[] }[]
    >(
      `WITH cur_fm AS
  (SELECT *
   FROM finished_match fm
   INNER JOIN player_in_match this_plr ON this_plr."playerId" = $2
   AND this_plr."matchId" = fm.id
   WHERE id = $1)
SELECT pim."playerId" AS reported_steam_id,
       fm."timestamp" AS match_date,
       array_agg(DISTINCT pr.reporter_steam_id) AS reporters
FROM player_in_match pim
INNER JOIN cur_fm fm ON fm.id = pim."matchId"
LEFT JOIN player_report pr ON pr.match_id = pim."matchId"
AND pr.reported_steam_id = pim."playerId" GROUP
    BY 1,
       2`,
      [matchId, steamId],
    );
  }

}
