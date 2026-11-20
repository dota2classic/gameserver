import { Injectable, Logger } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
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

export type PlayerRecords = Record<RecordTimespan, RecordEntry[]>;

const RECORD_VALUES: [PlayerRecordType, string][] = [
  [PlayerRecordType.KDA, "(pim.kills + pim.assists) / GREATEST(pim.deaths, 1)"],
  [PlayerRecordType.KILLS, "pim.kills"],
  [PlayerRecordType.DEATHS, "pim.deaths"],
  [PlayerRecordType.ASSISTS, "pim.assists"],
  [PlayerRecordType.LAST_HITS, "pim.last_hits"],
  [PlayerRecordType.DENIES, "pim.denies"],
  [PlayerRecordType.GPM, "pim.gpm"],
  [PlayerRecordType.XPM, "pim.xpm"],
  [PlayerRecordType.NETWORTH, "pim.gold"],
  [PlayerRecordType.TOWER_DAMAGE, "pim.tower_damage"],
  [PlayerRecordType.HERO_DAMAGE, "pim.hero_damage"],
  [PlayerRecordType.HERO_HEALING, "pim.hero_healing"],
];

const RECORD_PERIODS: [RecordTimespan, string][] = [
  [RecordTimespan.OVERALL, "true"],
  [
    RecordTimespan.SEASON,
    "fm.timestamp >= (SELECT gs.start_timestamp::date FROM game_season gs ORDER BY gs.start_timestamp DESC LIMIT 1)",
  ],
  [
    RecordTimespan.MONTHLY,
    "fm.timestamp >= date_trunc('month', localtimestamp) AND fm.timestamp < date_trunc('month', localtimestamp) + interval '1 month'",
  ],
  [
    RecordTimespan.DAY,
    "fm.timestamp >= date_trunc('day', localtimestamp) AND fm.timestamp < date_trunc('day', localtimestamp) + interval '1 day'",
  ],
];

const RECORD_MODES = [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED];

type RecordHolderRow = { fm_id: number; steam_id: string } & Record<
  PlayerRecordType,
  boolean
>;

const recordHoldersQuery = (period: string, byPlayer: boolean) => `
WITH scope AS NOT MATERIALIZED (
  SELECT fm.id AS fm_id, pim.*
  FROM finished_match fm
  INNER JOIN player_in_match pim ON pim."matchId" = fm.id
  WHERE fm.matchmaking_mode = ANY($1) AND (${period})${byPlayer ? ' AND pim."playerId" = $2' : ""}
),
best AS (
  SELECT ${RECORD_VALUES.map(([type, value]) => `max(${value}) AS "${type}"`).join(", ")}
  FROM scope pim
)
SELECT pim.fm_id, pim."playerId" AS steam_id, ${RECORD_VALUES.map(([type, value]) => `(${value}) = best."${type}" AS "${type}"`).join(", ")}
FROM scope pim
CROSS JOIN best
WHERE ${RECORD_VALUES.map(([type, value]) => `(${value}) = best."${type}"`).join(" OR ")}
ORDER BY pim.fm_id, pim."playerId"`;

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

  public async getPlayerRecords(steamId?: string): Promise<PlayerRecords> {
    const holders: [RecordTimespan, (RecordHolderRow | undefined)[]][] = [];
    for (const [span, period] of RECORD_PERIODS) {
      const rows = await this.findRecordHolders(period, steamId);
      holders.push([
        span,
        RECORD_VALUES.map(([type]) => rows.find((row) => row[type])),
      ]);
    }

    const matchIds = [
      ...new Set(
        holders.flatMap(([, picked]) =>
          picked.filter(Boolean).map((row) => row.fm_id),
        ),
      ),
    ];
    const matches = matchIds.length
      ? await this.finishedMatchEntityRepository.find({
          where: { id: In(matchIds) },
        })
      : [];
    const matchById = new Map(matches.map((match) => [match.id, match]));

    const records = {} as PlayerRecords;
    for (const [span, picked] of holders) {
      records[span] = RECORD_VALUES.map(([type], i): RecordEntry => {
        const holder = picked[i];
        return holder
          ? { type, steamId: holder.steam_id, match: matchById.get(holder.fm_id) }
          : { type, steamId, match: undefined };
      });
    }
    return records;
  }

  private findRecordHolders(
    period: string,
    steamId?: string,
  ): Promise<RecordHolderRow[]> {
    return this.datasource.query<RecordHolderRow[]>(
      recordHoldersQuery(period, !!steamId),
      steamId ? [RECORD_MODES, steamId] : [RECORD_MODES],
    );
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
