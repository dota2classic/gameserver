import { Injectable, Logger } from '@nestjs/common';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { EventBus } from '@nestjs/cqrs';
import { PlayerReportStateUpdatedEvent } from 'gameserver/event/player-report-state-updated.event';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';
import { PlayerReportsDto } from 'rest/dto/player.dto';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class PlayerReportService {
  private logger = new Logger(PlayerReportService.name);

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
    commentary: string,
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
        commentary: commentary,
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

  @Cron(CronExpression.EVERY_MINUTE)
  public async getPlayersAspectPerformance() {
    const minGamesToBeReportable = 5;
    const ruinThreshold = 0.25;
    const toxicThreshold = 0.2;

    const q = await this.ds.query<
      {
        steam_id: string;
        ruin_degree: number;
        toxic_degree: number;
        game_count: number;
      }[]
    >(
      `
    WITH timeframe AS
  (SELECT now() - $7::interval AS window_start_date),
     base AS
  (SELECT pe.reported_steam_id AS steam_id,
          count(DISTINCT pa.match_id) AS game_count,
          count(distinct(pe.reporter_steam_id, pe.match_id)) filter (WHERE pe.chosen_aspect = $3) AS ruiner,
          count(distinct(pe.reporter_steam_id, pe.match_id)) filter (WHERE pe.chosen_aspect IN ($2, $4)) AS good,
          count(distinct(pe.reporter_steam_id, pe.match_id)) filter (WHERE pe.chosen_aspect = $1) AS toxic,
          count(distinct(pe.reporter_steam_id, pe.match_id)) filter (WHERE pe.chosen_aspect = $5) AS friendly
   FROM player_report pe
   LEFT JOIN player_report_status prs ON prs.steam_id = pe.reported_steam_id
   LEFT JOIN timeframe tf ON TRUE
   LEFT JOIN player_activity pa ON pa.steam_id = pe.reported_steam_id
   AND pa.datetime >= greatest(tf.window_start_date, prs.report_summary_timestamp)
   WHERE pe."createdAt" >= greatest(tf.window_start_date, prs.report_summary_timestamp)
   GROUP BY 1
   ORDER BY 1 ASC,
            2 DESC)
SELECT p.steam_id as steam_id,
       (p.ruiner::float - p.good) / greatest (1, p.game_count) AS ruin_degree,
       (p.toxic::float - p.friendly) / greatest (1, p.game_count) AS toxic_degree,
       p.game_count::int AS game_count
FROM base p
WHERE p.game_count >= $6
ORDER BY 2 DESC,
         3 DESC;
    `,
      [
        PlayerAspect.TOXIC,
        PlayerAspect.WINNER,
        PlayerAspect.RUINER,
        PlayerAspect.GOOD,
        PlayerAspect.FRIENDLY,
        minGamesToBeReportable,
        "3 days",
      ],
    );

    const ruiners = q.filter((t) => t.ruin_degree >= ruinThreshold);
    const toxic = q.filter((t) => t.toxic_degree >= toxicThreshold);

    this.logger.log(q);

    this.logger.log("Applying crimes to ruiners:", ruiners);
    this.logger.log("Applying crimes to toxics:", toxic);

    await this.ds.transaction(async (tx) => {
      // Update cutoff timestamp
      await tx.update(
        PlayerReportStatusEntity,
        {
          steam_id: In(ruiners.concat(toxic).map((it) => it.steam_id)),
        },
        {
          reportSummaryTimestamp: new Date(),
        },
      );

      // Create crime logs
      await tx.save(
        ruiners.map(
          (r) =>
            new PlayerCrimeLogEntity(
              r.steam_id,
              BanReason.REPORTS,
              MatchmakingMode.UNRANKED,
              null,
            ),
        ),
      );


      // FIXME: make this happen when it actually does bans
      // this.ebus.publishAll(
      //   ruiners.map(
      //     (ruiner) => new PlayerReportBanCreatedEvent(ruiner.steam_id),
      //   ),
      // );

      await tx.save(
        toxic.map(
          (r) =>
            new PlayerCrimeLogEntity(
              r.steam_id,
              BanReason.COMMUNICATION_REPORTS,
              MatchmakingMode.UNRANKED,
              null,
            ),
        ),
      );
    });
  }
}
