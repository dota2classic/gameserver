import { MigrationInterface, QueryRunner } from 'typeorm';

export class LeaderboardViewSeasonGames1740529720602 implements MigrationInterface {
    name = 'LeaderboardViewSeasonGames1740529720602'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS 

with current_season as (
select
    *
from
    game_season gs
order by
    gs.start_timestamp desc
limit 1),
cte as (
select
    plr."playerId" as steam_id,
    count(*)::int as games,
    count(*) filter (where fm.timestamp >= cs.start_timestamp)  as season_games,
    count(*) filter (where fm.winner = plr.team) as wins,
    coalesce(vp.mmr,
    -1) as mmr
from
    player_in_match plr
inner join current_season cs on
    true
left join version_player vp on
    plr."playerId" = vp.steam_id
    and vp.season_id = cs.id
inner join finished_match fm on
    plr."matchId" = fm.id
    and fm.matchmaking_mode in (0, 1)
group by
    plr."playerId",
    vp.mmr)
select
    p.steam_id,
    p.wins,
    p.games,
    p.season_games,
    p.mmr as mmr,
    avg(pim.kills)::float as kills,
    avg(pim.deaths)::float as deaths,
    avg(pim.assists)::float as assists,
    sum(m.duration)::int as play_time,
    (row_number() over (
order by
    p.mmr desc,
    p.games desc))::int as rank
from
    cte p
inner join player_in_match pim on
    pim."playerId" = p.steam_id
inner join finished_match m on
    pim."matchId" = m.id
group by
    p.steam_id,
    p.mmr,
    p.games,
    p.season_games,
    p.wins
order by
    rank asc,
    games desc
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","with current_season as (\nselect\n    *\nfrom\n    game_season gs\norder by\n    gs.start_timestamp desc\nlimit 1),\ncte as (\nselect\n    plr.\"playerId\" as steam_id,\n    count(*)::int as games,\n    count(*) filter (where fm.timestamp >= cs.start_timestamp)  as season_games,\n    count(*) filter (where fm.winner = plr.team) as wins,\n    coalesce(vp.mmr,\n    -1) as mmr\nfrom\n    player_in_match plr\ninner join current_season cs on\n    true\nleft join version_player vp on\n    plr.\"playerId\" = vp.steam_id\n    and vp.season_id = cs.id\ninner join finished_match fm on\n    plr.\"matchId\" = fm.id\n    and fm.matchmaking_mode in (0, 1)\ngroup by\n    plr.\"playerId\",\n    vp.mmr)\nselect\n    p.steam_id,\n    p.wins,\n    p.games,\n    p.season_games,\n    p.mmr as mmr,\n    avg(pim.kills)::float as kills,\n    avg(pim.deaths)::float as deaths,\n    avg(pim.assists)::float as assists,\n    sum(m.duration)::int as play_time,\n    (row_number() over (\norder by\n    p.mmr desc,\n    p.games desc))::int as rank\nfrom\n    cte p\ninner join player_in_match pim on\n    pim.\"playerId\" = p.steam_id\ninner join finished_match m on\n    pim.\"matchId\" = m.id\ngroup by\n    p.steam_id,\n    p.mmr,\n    p.games,\n    p.season_games,\n    p.wins\norder by\n    rank asc,\n    games desc"]);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e8c7c5db9c88413214a6ee58c9" ON "leaderboard_view" ("steam_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_07fed7963da996f578e8de9ba8" ON "leaderboard_view" ("mmr") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5a07d94e86fda68f9e1892b30" ON "leaderboard_view" ("games") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_d5a07d94e86fda68f9e1892b30"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07fed7963da996f578e8de9ba8"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e8c7c5db9c88413214a6ee58c9"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS with current_season as (
select
    *
from
    game_season gs
order by
    gs.start_timestamp desc
limit 1),
cte as (
select
    plr."playerId" as steam_id,
    count(*)::int as any_games,
    sum((fm.winner = plr.team)::int)::int as bot_wins,
    sum((fm.matchmaking_mode in (0, 1))::int)::int as games,
    sum((fm.winner = plr.team and fm.matchmaking_mode in (0, 1))::int)::int as wins,
    coalesce(vp.mmr,
    -1) as mmr
from
    player_in_match plr
inner join current_season cs on true
left join version_player vp on
    plr."playerId" = vp.steam_id and vp.season_id = cs.id
inner join finished_match fm on
    plr."matchId" = fm.id
group by
    plr."playerId",
    vp.mmr)
select
    p.steam_id,
    p.wins,
    p.games,
    p.any_games,
    p.bot_wins,
    p.mmr as mmr,
    avg(pim.kills)::float as kills,
    avg(pim.deaths)::float as deaths,
    avg(pim.assists)::float as assists,
    sum(m.duration)::int as play_time,
    sum((m.matchmaking_mode in (0, 1))::int) as ranked_games,
    (row_number() over (
order by
    p.mmr desc, p.games DESC))::int as rank
from
    cte p
inner join player_in_match pim on
    pim."playerId" = p.steam_id
inner join finished_match m on
    pim."matchId" = m.id
group by
    p.steam_id,
    p.mmr,
    p.games,
    p.wins,
    p.any_games,
    p.bot_wins
order by
    rank,
    games desc`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","with current_season as (\nselect\n    *\nfrom\n    game_season gs\norder by\n    gs.start_timestamp desc\nlimit 1),\ncte as (\nselect\n    plr.\"playerId\" as steam_id,\n    count(*)::int as any_games,\n    sum((fm.winner = plr.team)::int)::int as bot_wins,\n    sum((fm.matchmaking_mode in (0, 1))::int)::int as games,\n    sum((fm.winner = plr.team and fm.matchmaking_mode in (0, 1))::int)::int as wins,\n    coalesce(vp.mmr,\n    -1) as mmr\nfrom\n    player_in_match plr\ninner join current_season cs on true\nleft join version_player vp on\n    plr.\"playerId\" = vp.steam_id and vp.season_id = cs.id\ninner join finished_match fm on\n    plr.\"matchId\" = fm.id\ngroup by\n    plr.\"playerId\",\n    vp.mmr)\nselect\n    p.steam_id,\n    p.wins,\n    p.games,\n    p.any_games,\n    p.bot_wins,\n    p.mmr as mmr,\n    avg(pim.kills)::float as kills,\n    avg(pim.deaths)::float as deaths,\n    avg(pim.assists)::float as assists,\n    sum(m.duration)::int as play_time,\n    sum((m.matchmaking_mode in (0, 1))::int) as ranked_games,\n    (row_number() over (\norder by\n    p.mmr desc, p.games DESC))::int as rank\nfrom\n    cte p\ninner join player_in_match pim on\n    pim.\"playerId\" = p.steam_id\ninner join finished_match m on\n    pim.\"matchId\" = m.id\ngroup by\n    p.steam_id,\n    p.mmr,\n    p.games,\n    p.wins,\n    p.any_games,\n    p.bot_wins\norder by\n    rank,\n    games desc"]);
    }

}
