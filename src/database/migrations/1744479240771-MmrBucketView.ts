import { MigrationInterface, QueryRunner } from 'typeorm';

export class MmrBucketView1744479240771 implements MigrationInterface {
    name = 'MmrBucketView1744479240771'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE MATERIALIZED VIEW "mmr_bucket_view" AS 
    with fantasy_history as (
      select
      fm.id,
        pim."playerId" as steam_id,
      vp.mmr as mmr,
      pim.hero,
      fm.duration,
      fantasy_score(pim) as fp
    from
        player_in_match pim
    inner join finished_match fm on
        fm.id = pim."matchId"
    inner join version_player vp on
        vp.steam_id = pim."playerId"
    where
        fm.matchmaking_mode in (0, 1)
        and fm.duration > 0
        and fm.timestamp >= (
            select
                gs.start_timestamp
            from
                game_season gs
            order by
                gs.start_timestamp desc
            limit 1)
    )
    select
        (fh.mmr / 500)::int as mmr_bucket,
        avg(fh.fp / fh.duration * 60)::numeric as fpm,
        count(fh.id)::int as matches
    from
        fantasy_history fh
    group by
        1
    having 
        count(fh.id) > 100
    `);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","mmr_bucket_view","with fantasy_history as (\n      select\n      fm.id,\n        pim.\"playerId\" as steam_id,\n      vp.mmr as mmr,\n      pim.hero,\n      fm.duration,\n      fantasy_score(pim) as fp\n    from\n        player_in_match pim\n    inner join finished_match fm on\n        fm.id = pim.\"matchId\"\n    inner join version_player vp on\n        vp.steam_id = pim.\"playerId\"\n    where\n        fm.matchmaking_mode in (0, 1)\n        and fm.duration > 0\n        and fm.timestamp >= (\n            select\n                gs.start_timestamp\n            from\n                game_season gs\n            order by\n                gs.start_timestamp desc\n            limit 1)\n    )\n    select\n        (fh.mmr / 500)::int as mmr_bucket,\n        avg(fh.fp / fh.duration * 60)::numeric as fpm,\n        count(fh.id)::int as matches\n    from\n        fantasy_history fh\n    group by\n        1\n    having \n        count(fh.id) > 100"]);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","mmr_bucket_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "mmr_bucket_view"`);
    }

}
