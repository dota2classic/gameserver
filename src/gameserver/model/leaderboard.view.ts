import { Index, ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression: `
WITH pm_agg AS
  (SELECT pim."playerId" AS steam_id,
          fm.season_id,
          count(*) AS games,
          count(*) FILTER (
                           WHERE fm.timestamp >= gs.start_timestamp) AS calibration_games,
          count(*) FILTER (
                           WHERE pim.team = fm.winner) AS wins,
          count(*) FILTER (
                           WHERE pim.abandoned) AS abandons,
          avg(pim.kills) AS kills,
          avg(pim.deaths) AS deaths,
          avg(pim.assists) AS assists,
          sum(fm.duration) AS play_time
   FROM player_in_match pim
   JOIN finished_match fm ON fm.id = pim."matchId"
   JOIN game_season gs ON gs.id = fm.season_id
   WHERE fm.matchmaking_mode IN (0,
                                 1)
   GROUP BY pim."playerId",
            fm.season_id)
SELECT vp.steam_id,
       vp.season_id AS season_id,
       vp.mmr,
       games,
       calibration_games,
       wins,
       abandons,
       kills,
       assists,
       deaths,
       play_time,
       ROW_NUMBER() OVER (PARTITION BY vp.season_id
                          ORDER BY vp.mmr DESC) AS RANK,
       recalibration_attempted
FROM version_player vp
JOIN pm_agg pa ON pa.steam_id = vp.steam_id
AND pa.season_id = vp.season_id
LEFT JOIN LATERAL
  (SELECT 1 AS recalibration_attempted
   FROM recalibration rc
   WHERE rc.steam_id = vp.steam_id
     AND rc.season_id = vp.season_id
   LIMIT 1) rc ON TRUE
`,
  materialized: true,
})
@Index(["steamId", "seasonId"], { unique: true })
export class LeaderboardView {
  @ViewColumn({ name: "steam_id" })
  steamId: string;

  @ViewColumn({ name: "season_id" })
  seasonId: number;

  @ViewColumn()
  rank: number | null;

  @Index()
  @ViewColumn()
  mmr: number;

  @Index()
  @ViewColumn()
  games: number;

  @ViewColumn({ name: "calibration_games" })
  calibrationGames: number;

  @ViewColumn()
  wins: number;

  @ViewColumn()
  abandons: number;

  @ViewColumn()
  kills: number;
  @ViewColumn()
  deaths: number;
  @ViewColumn()
  assists: number;

  @ViewColumn({
    name: "recalibration_attempted",
  })
  recalibrationAttempted: boolean;

  @ViewColumn({ name: "play_time" })
  playtime: number;
}
