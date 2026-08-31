import { MigrationInterface, QueryRunner } from 'typeorm';

const ORIGINAL_EXPRESSION = `WITH pm_agg AS
  (SELECT pim."playerId" AS steam_id,
          fm.season_id,
          count(*) AS games,
          count(*) FILTER ( WHERE fm.timestamp >= gs.start_timestamp) AS calibration_games,
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
   WHERE fm.matchmaking_mode IN (0, 1)
   GROUP BY pim."playerId",
            fm.season_id)
SELECT vp.steam_id,
       vp.season_id AS season_id,
       vp.mmr::int,
       games::int,
       calibration_games::int,
       wins::int,
       abandons::int,
       kills::float,
       assists::float,
       deaths::float,
       play_time::int,
       (ROW_NUMBER() OVER (PARTITION BY vp.season_id
                          ORDER BY vp.mmr DESC))::int AS RANK,
       (rc is not null and recalibration_attempted = 1)::boolean as recalibration_attempted
FROM version_player vp
JOIN pm_agg pa ON pa.steam_id = vp.steam_id
AND pa.season_id = vp.season_id
LEFT JOIN LATERAL
  (SELECT 1 AS recalibration_attempted
   FROM recalibration rc
   WHERE rc.steam_id = vp.steam_id
     AND rc.season_id = vp.season_id
   LIMIT 1) rc ON true
`;

const WITH_SORTABLE_COLUMNS_EXPRESSION = `WITH pm_agg AS
  (SELECT pim."playerId" AS steam_id,
          fm.season_id,
          count(*) AS games,
          count(*) FILTER ( WHERE fm.timestamp >= gs.start_timestamp) AS calibration_games,
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
   WHERE fm.matchmaking_mode IN (0, 1)
   GROUP BY pim."playerId",
            fm.season_id)
SELECT vp.steam_id,
       vp.season_id AS season_id,
       vp.mmr::int,
       games::int,
       calibration_games::int,
       wins::int,
       abandons::int,
       kills::float,
       assists::float,
       deaths::float,
       play_time::int,
       (wins::float / NULLIF(games, 0)::float) AS winrate,
       ((kills::float + assists::float) / GREATEST(deaths::float, 1)) AS kda,
       (ROW_NUMBER() OVER (PARTITION BY vp.season_id
                          ORDER BY vp.mmr DESC))::int AS RANK,
       (rc is not null and recalibration_attempted = 1)::boolean as recalibration_attempted
FROM version_player vp
JOIN pm_agg pa ON pa.steam_id = vp.steam_id
AND pa.season_id = vp.season_id
LEFT JOIN LATERAL
  (SELECT 1 AS recalibration_attempted
   FROM recalibration rc
   WHERE rc.steam_id = vp.steam_id
     AND rc.season_id = vp.season_id
   LIMIT 1) rc ON true
`;

// Adds winrate/kda as real columns on leaderboard_view so the leaderboard
// can be sorted by them server-side (previously only computable client-side
// from raw wins/games/kills/deaths/assists). Materialized views can't be
// ALTERed in place — drop and recreate, same as the underlying indexes and
// the typeorm_metadata bookkeeping row TypeORM expects.
export class LeaderboardSortableColumns1788169955066 implements MigrationInterface {
  name = 'LeaderboardSortableColumns1788169955066';

  private async dropViewAndIndexes(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_07fed7963da996f578e8de9ba8"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_d5a07d94e86fda68f9e1892b30"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_ea58399f11e089d75e48bae37f"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_leaderboard_view_winrate"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_leaderboard_view_kda"`);
    await queryRunner.query(
      `DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`,
      ['MATERIALIZED_VIEW', 'leaderboard_view', 'public'],
    );
    await queryRunner.query(`DROP MATERIALIZED VIEW IF EXISTS "leaderboard_view"`);
  }

  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.dropViewAndIndexes(queryRunner);

    await queryRunner.query(
      `CREATE MATERIALIZED VIEW "leaderboard_view" AS ${WITH_SORTABLE_COLUMNS_EXPRESSION}`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      ['public', 'MATERIALIZED_VIEW', 'leaderboard_view', WITH_SORTABLE_COLUMNS_EXPRESSION],
    );

    await queryRunner.query(`CREATE INDEX "IDX_07fed7963da996f578e8de9ba8" ON "leaderboard_view" ("mmr") `);
    await queryRunner.query(`CREATE INDEX "IDX_d5a07d94e86fda68f9e1892b30" ON "leaderboard_view" ("games") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ea58399f11e089d75e48bae37f" ON "leaderboard_view" ("steam_id", "season_id") `);
    await queryRunner.query(`CREATE INDEX "IDX_leaderboard_view_winrate" ON "leaderboard_view" ("winrate") `);
    await queryRunner.query(`CREATE INDEX "IDX_leaderboard_view_kda" ON "leaderboard_view" ("kda") `);

    await queryRunner.query(`REFRESH MATERIALIZED VIEW "leaderboard_view"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropViewAndIndexes(queryRunner);

    await queryRunner.query(
      `CREATE MATERIALIZED VIEW "leaderboard_view" AS ${ORIGINAL_EXPRESSION}`,
    );
    await queryRunner.query(
      `INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`,
      ['public', 'MATERIALIZED_VIEW', 'leaderboard_view', ORIGINAL_EXPRESSION],
    );

    await queryRunner.query(`CREATE INDEX "IDX_07fed7963da996f578e8de9ba8" ON "leaderboard_view" ("mmr") `);
    await queryRunner.query(`CREATE INDEX "IDX_d5a07d94e86fda68f9e1892b30" ON "leaderboard_view" ("games") `);
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ea58399f11e089d75e48bae37f" ON "leaderboard_view" ("steam_id", "season_id") `);
    await queryRunner.query(`REFRESH MATERIALIZED VIEW "leaderboard_view"`);
  }
}
