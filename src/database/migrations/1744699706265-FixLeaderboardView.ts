import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixLeaderboardView1744699706265 implements MigrationInterface {
    name = 'FixLeaderboardView1744699706265'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS 
select
    vp.steam_id,
    vp.season_id as season_id,
    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,
    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,
    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,
    vp.mmr as mmr,
    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,
    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,
    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,
    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,
    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank
from
    version_player vp
inner join 
    game_season gs on gs.id = vp.season_id
inner join
    player_in_match pim on pim."playerId" = vp.steam_id
inner join 
    finished_match fm on pim."matchId" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id
group by
    vp.steam_id,
    vp.season_id,
    vp.mmr
order by
    rank asc,
    games desc;
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","select\n    vp.steam_id,\n    vp.season_id as season_id,\n    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,\n    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,\n    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,\n    vp.mmr as mmr,\n    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,\n    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,\n    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,\n    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,\n    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank\nfrom\n    version_player vp\ninner join \n    game_season gs on gs.id = vp.season_id\ninner join\n    player_in_match pim on pim.\"playerId\" = vp.steam_id\ninner join \n    finished_match fm on pim.\"matchId\" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id\ngroup by\n    vp.steam_id,\n    vp.season_id,\n    vp.mmr\norder by\n    rank asc,\n    games desc;"]);
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
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS select
    vp.steam_id,
    vp.season_id as season_id,
    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,
    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,
    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,
    vp.mmr as mmr,
    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,
    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,
    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,
    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,
    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank
from
    version_player vp
inner join 
    game_season gs on gs.id = vp.season_id
inner join
    player_in_match pim on pim."playerId" = vp.steam_id
inner join 
    finished_match fm on pim."matchId" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id
group by
    vp.steam_id,
    vp.season_id
order by
    rank asc,
    games desc;`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","select\n    vp.steam_id,\n    vp.season_id as season_id,\n    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,\n    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,\n    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,\n    vp.mmr as mmr,\n    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,\n    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,\n    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,\n    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,\n    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank\nfrom\n    version_player vp\ninner join \n    game_season gs on gs.id = vp.season_id\ninner join\n    player_in_match pim on pim.\"playerId\" = vp.steam_id\ninner join \n    finished_match fm on pim.\"matchId\" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id\ngroup by\n    vp.steam_id,\n    vp.season_id\norder by\n    rank asc,\n    games desc;"]);
    }

}
