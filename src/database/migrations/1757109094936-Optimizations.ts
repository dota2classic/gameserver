import { MigrationInterface, QueryRunner } from 'typeorm';

export class Optimizations1757109094936 implements MigrationInterface {
    name = 'Optimizations1757109094936'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`CREATE INDEX "idx_finished_match_id_winner" ON "finished_match" ("id", "winner") `);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS 
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
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","WITH pm_agg AS\n  (SELECT pim.\"playerId\" AS steam_id,\n          fm.season_id,\n          count(*) AS games,\n          count(*) FILTER (\n                           WHERE fm.timestamp >= gs.start_timestamp) AS calibration_games,\n          count(*) FILTER (\n                           WHERE pim.team = fm.winner) AS wins,\n          count(*) FILTER (\n                           WHERE pim.abandoned) AS abandons,\n          avg(pim.kills) AS kills,\n          avg(pim.deaths) AS deaths,\n          avg(pim.assists) AS assists,\n          sum(fm.duration) AS play_time\n   FROM player_in_match pim\n   JOIN finished_match fm ON fm.id = pim.\"matchId\"\n   JOIN game_season gs ON gs.id = fm.season_id\n   WHERE fm.matchmaking_mode IN (0,\n                                 1)\n   GROUP BY pim.\"playerId\",\n            fm.season_id)\nSELECT vp.steam_id,\n       vp.season_id AS season_id,\n       vp.mmr,\n       games,\n       calibration_games,\n       wins,\n       abandons,\n       kills,\n       assists,\n       deaths,\n       play_time,\n       ROW_NUMBER() OVER (PARTITION BY vp.season_id\n                          ORDER BY vp.mmr DESC) AS RANK,\n       recalibration_attempted\nFROM version_player vp\nJOIN pm_agg pa ON pa.steam_id = vp.steam_id\nAND pa.season_id = vp.season_id\nLEFT JOIN LATERAL\n  (SELECT 1 AS recalibration_attempted\n   FROM recalibration rc\n   WHERE rc.steam_id = vp.steam_id\n     AND rc.season_id = vp.season_id\n   LIMIT 1) rc ON TRUE"]);
        await queryRunner.query(`CREATE INDEX "IDX_07fed7963da996f578e8de9ba8" ON "leaderboard_view" ("mmr") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5a07d94e86fda68f9e1892b30" ON "leaderboard_view" ("games") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ea58399f11e089d75e48bae37f" ON "leaderboard_view" ("steam_id", "season_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_ea58399f11e089d75e48bae37f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5a07d94e86fda68f9e1892b30"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07fed7963da996f578e8de9ba8"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`DROP INDEX "public"."idx_finished_match_id_winner"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS select
    vp.steam_id,
    vp.season_id as season_id,
    sum(count(1) filter (where fm.timestamp >= GREATEST(gs.start_timestamp, rc.created_at))) over (partition by vp.steam_id, vp.season_id) as calibration_games,
    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,
    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,
    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,
    vp.mmr as mmr,
    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,
    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,
    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,
    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,
    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank,
    count(rc) > 0 as recalibration_attempted
from
    version_player vp
inner join 
    game_season gs on gs.id = vp.season_id
inner join
    player_in_match pim on pim."playerId" = vp.steam_id
left join recalibration rc on rc.steam_id = vp.steam_id and rc.season_id = vp.season_id
inner join 
    finished_match fm on pim."matchId" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id
group by
    vp.steam_id,
    vp.season_id,
    vp.mmr
order by
    rank asc,
    games desc;`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","select\n    vp.steam_id,\n    vp.season_id as season_id,\n    sum(count(1) filter (where fm.timestamp >= GREATEST(gs.start_timestamp, rc.created_at))) over (partition by vp.steam_id, vp.season_id) as calibration_games,\n    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,\n    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,\n    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,\n    vp.mmr as mmr,\n    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,\n    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,\n    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,\n    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,\n    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank,\n    count(rc) > 0 as recalibration_attempted\nfrom\n    version_player vp\ninner join \n    game_season gs on gs.id = vp.season_id\ninner join\n    player_in_match pim on pim.\"playerId\" = vp.steam_id\nleft join recalibration rc on rc.steam_id = vp.steam_id and rc.season_id = vp.season_id\ninner join \n    finished_match fm on pim.\"matchId\" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id\ngroup by\n    vp.steam_id,\n    vp.season_id,\n    vp.mmr\norder by\n    rank asc,\n    games desc;"]);
    }

}
