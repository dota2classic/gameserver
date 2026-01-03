import { Injectable, Logger } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerDailyRecord, PlayerYearSummaryDto } from 'rest/dto/record.dto';

export enum PlayerRecordType {
  KILLS = "KILLS",
  KDA = "KDA",
  ASSISTS = "ASSISTS",
  DEATHS = "DEATHS",

  LAST_HITS = "LAST_HITS",
  DENIES = "DENIES",

  GPM = "GPM",
  XPM = "XPM",

  NETWORTH = "NETWORTH",

  TOWER_DAMAGE = "TOWER_DAMAGE",
  HERO_DAMAGE = "HERO_DAMAGE",
  HERO_HEALING = "HERO_HEALING",
}

export enum RecordTimespan {
  OVERALL,
  SEASON,
  MONTHLY,
  DAY,
}

export interface RecordEntry {
  type: PlayerRecordType;
  steamId: string;
  match?: FinishedMatchEntity;
}

export interface PlayerYearSummary {
  steam_id: string;

  last_hits: number;
  denies: number;
  gold: number;
  support_gold: number;

  kills: number;
  deaths: number;
  assists: number;
  misses: number;

  kda: number;

  played_games: number;
}

interface PlayerMostPlayedMode {
  steam_id: string;

  mode: MatchmakingMode;

  played_games: number;
}

interface PlayerMostPurchasedItem {
  steam_id: string;

  most_purchased_item: number;

  purchase_count: number;
}

@Injectable()
export class RecordService {
  private logger = new Logger(RecordService.name)

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
    private readonly datasource: DataSource,
  ) {}

  public async getPlayerRecords(span: RecordTimespan, steamId?: string) {
    return Promise.all([
      this.getMostFactory(
        span,
        PlayerRecordType.KDA,
        "MAX((pim.kills + pim.assists) / GREATEST(pim.deaths, 1))",
        steamId,
      ),

      this.getMostFactory(
        span,
        PlayerRecordType.KILLS,
        "max(pim.kills)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.DEATHS,
        "max(pim.deaths)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.ASSISTS,
        "max(pim.assists)",
        steamId,
      ),

      this.getMostFactory(
        span,
        PlayerRecordType.LAST_HITS,
        "max(pim.last_hits)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.DENIES,
        "max(pim.denies)",
        steamId,
      ),

      this.getMostFactory(span, PlayerRecordType.GPM, "max(pim.gpm)", steamId),
      this.getMostFactory(span, PlayerRecordType.XPM, "max(pim.xpm)", steamId),

      this.getMostFactory(
        span,
        PlayerRecordType.NETWORTH,
        "max(pim.gold)",
        steamId,
      ),

      this.getMostFactory(
        span,
        PlayerRecordType.TOWER_DAMAGE,
        "max(pim.tower_damage)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.HERO_DAMAGE,
        "max(pim.hero_damage)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.HERO_HEALING,
        "max(pim.hero_healing)",
        steamId,
      ),
    ]);
  }

  public async dailyPlayerRecords() {
    return this.datasource.query<PlayerDailyRecord[]>(`
SELECT "playerId" AS steam_id,
       sum(mcle."change")::float AS mmr_change,
       count(*)::int AS games,
       (count(*) filter (
                         WHERE mcle.winner))::int AS wins,
       (count(*) filter (
                         WHERE NOT mcle.winner))::int AS loss
FROM mmr_change_log_entity mcle
INNER JOIN finished_match fm ON fm.id = mcle."matchId"
WHERE fm."timestamp"::date = now()::date
GROUP BY steam_id;
`);
  }

  private async getMostFactory(
    span: RecordTimespan,
    type: PlayerRecordType,
    condition: string,
    steamId?: string,
  ): Promise<RecordEntry> {
    let timeCondition: string | object;
    switch (span) {
      case RecordTimespan.OVERALL:
        timeCondition = "true";
        break;
      case RecordTimespan.SEASON:
        timeCondition = `fm.timestamp >= (
            select
                gs.start_timestamp::date
            from
                game_season gs
            order by
                gs.start_timestamp desc
            limit 1)`;
        break;
      case RecordTimespan.MONTHLY:
        timeCondition = `extract(YEAR FROM fm.timestamp) = extract(YEAR FROM now()) and extract(MONTH FROM fm.timestamp) = extract(MONTH FROM now())`;
        break;
      case RecordTimespan.DAY:
        timeCondition = `fm.timestamp::date = now()::date`;
    }

    let pimJoin = 'pim."matchId" = fm.id';
    if (steamId) {
      pimJoin += ` and pim."playerId" = '${steamId}'`;
    }

    const d = await this.datasource
      .createQueryBuilder()
      .addSelect([
        "fm.id as fm_id",
        'pim."playerId" as steam_id',
        `${condition} as mk`,
      ])
      .from("finished_match", "fm")
      .innerJoin("player_in_match", "pim", pimJoin)
      .where("fm.matchmaking_mode in (:...modes)", {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })
      .andWhere(timeCondition)
      .groupBy('fm.id, pim."playerId"')
      .orderBy("3", "DESC", "NULLS LAST")
      .limit(1)
      .getRawOne<{ fm_id: number; steam_id: string; mk: number }>();

    if (!d) {
      return {
        steamId: steamId,
        type: type,
        match: undefined,
      };
    }

    const fm = await this.finishedMatchEntityRepository.findOne({
      where: { id: d.fm_id },
      relations: ["players"],
    });

    return {
      type,
      match: fm,
      steamId: d.steam_id,
    };
  }

  public async yearResults(
    year: number,
    steamId: string,
  ): Promise<PlayerYearSummaryDto> {
    this.logger.log(`Getting yearly summary for ${steamId}`);
    const aggStats: PlayerYearSummary = await this.playerInMatchEntityRepository
      .query(
        `SELECT pa.steam_id,
       sum(pim.last_hits) AS last_hits,
       sum(pim.denies) AS denies,
       sum(pim.gold) AS gold,
       sum(pim.support_gold) AS support_gold,
       sum(pim.kills) AS kills,
       sum(pim.deaths) AS deaths,
       sum(pim.assists) AS assists,
       sum(pim.misses) AS misses,
       avg((pim.kills + pim.assists) / greatest(1, pim.deaths)) AS kda,
       count(fm.id) AS played_games
FROM player_activity pa
INNER JOIN finished_match fm ON fm.id = pa.match_id
INNER JOIN player_in_match pim ON pim."playerId" = pa.steam_id
AND pim."matchId" = pa.match_id
WHERE extract('YEAR'
              FROM pa.datetime) = $1
  AND pa.steam_id = $2
GROUP BY pa.steam_id`,
        [year, steamId],
      )
      .then((it) => it[0]);

    const itemData = await this.datasource
      .query<PlayerMostPurchasedItem[]>(
        `
    SELECT
        steam_id,
        item AS most_purchased_item,
        cnt as purchase_count
    FROM (
        SELECT
            pa.steam_id,
            item,
            count(*) AS cnt,
            row_number() OVER (
                PARTITION BY pa.steam_id
                ORDER BY count(*) DESC
            ) AS rn
        FROM player_activity pa
        JOIN player_in_match pim
            ON pim."playerId" = pa.steam_id
           AND pim."matchId" = pa.match_id
        CROSS JOIN LATERAL unnest(ARRAY[
            pim.item0,
            pim.item1,
            pim.item2,
            pim.item3,
            pim.item4,
            pim.item5
        ]) AS item
        WHERE extract(YEAR FROM pa.datetime) = $1
          AND pa.steam_id = $2
          AND item IS NOT null
          and item != 0
        GROUP BY pa.steam_id, item
    ) t
    WHERE rn = 1
    `,
        [year, steamId],
      )
      .then((it) => it[0]);

    const mostPlayedMode = await this.datasource
      .query<PlayerMostPlayedMode[]>(
        `
SELECT
    steam_id,
    mode,
    played_games
FROM (
    SELECT
        pa.steam_id,
        pa."mode",
        count(*) AS played_games,
        row_number() OVER (
            PARTITION BY pa.steam_id
            ORDER BY count(*) DESC
        ) AS rn
    FROM player_activity pa
    WHERE extract(YEAR FROM pa.datetime) = $1
      AND pa.steam_id = $2
    GROUP BY pa.steam_id, pa."mode"
) t
WHERE rn = 1;
    `,
        [year, steamId],
      )
      .then((it) => it[0]);

    return {
      assists: aggStats?.assists || 0,
      deaths: aggStats?.deaths || 0,
      denies: aggStats?.denies || 0,
      gold: aggStats?.gold || 0,
      kda: aggStats?.kda || 0,
      kills: aggStats?.kills || 0,
      last_hits: aggStats?.last_hits || 0,
      misses: aggStats?.misses || 0,
      support_gold: aggStats?.support_gold || 0,
      played_games: aggStats?.played_games || 0,
      steam_id: steamId,

      most_played_mode: mostPlayedMode?.mode || MatchmakingMode.BOTS,
      most_played_mode_count: mostPlayedMode?.played_games || 0,

      most_purchased_item: itemData?.most_purchased_item || 0,
      most_purchased_item_count: itemData?.purchase_count || 0,
    };
  }
}
