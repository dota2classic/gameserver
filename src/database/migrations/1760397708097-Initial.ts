import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1760397708097 implements MigrationInterface {
    name = 'Initial1760397708097'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "match_entity" ("id" SERIAL NOT NULL, "started" boolean NOT NULL DEFAULT false, "finished" boolean NOT NULL DEFAULT true, "server" character varying NOT NULL, "mode" integer NOT NULL, "matchInfoJson" text, CONSTRAINT "PK_4378e339adc7bd7c80f938afd9c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "game_server_session_player" ("steam_id" character varying NOT NULL, "match_id" integer NOT NULL, "party_id" character varying NOT NULL, "team" integer NOT NULL, "connection_state" integer NOT NULL, "abandoned" boolean NOT NULL DEFAULT false, "user_abandoned" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d86cef8868beb8c4bb677a7830b" PRIMARY KEY ("steam_id", "match_id"))`);
        await queryRunner.query(`CREATE TABLE "game_server_session" ("match_id" integer NOT NULL, "server_url" character varying NOT NULL, "room_id" character varying NOT NULL, "matchmaking_mode" integer NOT NULL, "game_mode" integer NOT NULL, "map" character varying NOT NULL, "game_state" integer NOT NULL, "duration" integer NOT NULL DEFAULT '0', "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f3e4ca88b4333c46b52c0851094" PRIMARY KEY ("match_id"))`);
        await queryRunner.query(`CREATE TABLE "game_server_model" ("url" character varying NOT NULL, "version" character varying NOT NULL DEFAULT 'Dota_681', CONSTRAINT "PK_8fe2dd5600020337bc94d7b1e6c" PRIMARY KEY ("url"))`);
        await queryRunner.query(`CREATE TABLE "player_crime_log_entity" ("id" SERIAL NOT NULL, "steam_id" character varying NOT NULL, "crime" integer NOT NULL, "match_id" integer, "lobby_type" integer, "handled" boolean NOT NULL DEFAULT false, "banTime" bigint NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fc97a11fe0efd50ef516dc2a6df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "version_player" ("steam_id" character varying NOT NULL, "mmr" integer NOT NULL DEFAULT '1500', "season_id" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_c5bb833217213a511320db60531" PRIMARY KEY ("steam_id", "season_id"))`);
        await queryRunner.query(`CREATE TABLE "recalibration" ("id" SERIAL NOT NULL, "steam_id" character varying NOT NULL, "season_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "one_recalibration_per_season" UNIQUE ("steam_id", "season_id"), CONSTRAINT "PK_e9de0b0728b553b8f6372a4eb2c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "game_season" ("id" integer NOT NULL, "start_timestamp" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "PK_ac3e643ed10f10a45e826c8e20e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."finished_match_patch_enum" AS ENUM('DOTA_684', 'DOTA_684_TURBO')`);
        await queryRunner.query(`CREATE TYPE "public"."finished_match_region_enum" AS ENUM('ru_moscow', 'ru_novosibirsk', 'eu_czech')`);
        await queryRunner.query(`CREATE TABLE "finished_match" ("winner" smallint NOT NULL, "id" integer NOT NULL, "game_mode" smallint NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "matchmaking_mode" smallint NOT NULL, "server" character varying, "duration" integer NOT NULL DEFAULT '0', "externalMatchId" integer, "patch" "public"."finished_match_patch_enum" NOT NULL DEFAULT 'DOTA_684', "region" "public"."finished_match_region_enum" NOT NULL DEFAULT 'ru_moscow', "season_id" integer NOT NULL DEFAULT '1', "tower_status" integer array NOT NULL DEFAULT '{0,0}', "barrack_status" integer array NOT NULL DEFAULT '{0,0}', CONSTRAINT "PK_d245682bfe9e61b5dc6707802bb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "match_timestamp_index" ON "finished_match" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "finished_match_matchmaking_mode_index" ON "finished_match" ("matchmaking_mode") `);
        await queryRunner.query(`CREATE INDEX "idx_finished_match_id_winner" ON "finished_match" ("id", "winner") `);
        await queryRunner.query(`CREATE TABLE "player_in_match" ("playerId" character varying NOT NULL, "matchId" integer NOT NULL, "team" integer NOT NULL, "kills" integer NOT NULL, "deaths" integer NOT NULL, "assists" integer NOT NULL, "level" integer NOT NULL, "gpm" integer NOT NULL DEFAULT '0', "xpm" integer NOT NULL DEFAULT '0', "hero_damage" integer NOT NULL DEFAULT '0', "tower_damage" integer NOT NULL DEFAULT '0', "hero_healing" integer NOT NULL DEFAULT '0', "abandoned" boolean NOT NULL DEFAULT false, "last_hits" integer NOT NULL DEFAULT '0', "denies" integer NOT NULL DEFAULT '0', "gold" integer NOT NULL DEFAULT '0', "hero" character varying NOT NULL, "item0" smallint NOT NULL DEFAULT '0', "item1" smallint NOT NULL DEFAULT '0', "item2" smallint NOT NULL DEFAULT '0', "item3" smallint NOT NULL DEFAULT '0', "item4" smallint NOT NULL DEFAULT '0', "item5" smallint NOT NULL DEFAULT '0', "bear" integer array, "support_gold" integer NOT NULL DEFAULT '0', "support_ability_value" integer NOT NULL DEFAULT '0', "misses" integer NOT NULL DEFAULT '0', "party_index" integer, CONSTRAINT "PK_pim_player_match_idx" PRIMARY KEY ("playerId", "matchId"))`);

        const s = await queryRunner.query(`
        create or replace
        function fantasy_score(pim player_in_match) returns numeric 
language plpgsql
as 
$$
begin
return pim.kills * 0.3 + pim.deaths * -0.3 + pim.assists * 0.2 + pim.last_hits * 0.003 + pim.denies * 0.005 + pim.gpm * 0.002 + pim.xpm * 0.002 + pim.hero_healing * 0.01 + pim.hero_damage * 0.003 + pim.tower_damage * 0.01;
end;
$$;`);


        await queryRunner.query(`CREATE INDEX "player_match_index" ON "player_in_match" ("matchId") `);
        await queryRunner.query(`CREATE TABLE "mmr_change_log_entity" ("playerId" character varying NOT NULL, "matchId" integer NOT NULL, "winner" boolean NOT NULL, "winnerAverage" double precision NOT NULL, "loserAverage" double precision NOT NULL, "mmrBefore" double precision NOT NULL, "mmrAfter" double precision NOT NULL, "hiddenMmr" boolean NOT NULL DEFAULT false, "change" double precision NOT NULL, "calibration_game" boolean NOT NULL DEFAULT false, "player_performance_coefficient" double precision NOT NULL DEFAULT '1', "streak" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_b949e76fd0ce751f3a5acd090c7" PRIMARY KEY ("playerId", "matchId"))`);
        await queryRunner.query(`CREATE TABLE "player_report_status" ("steam_id" character varying NOT NULL, "updated_with_match_id" integer, "reports" integer NOT NULL DEFAULT '1', "report_summary_timestamp" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_f6d263eee3bfb2a6e2c0c660b85" PRIMARY KEY ("steam_id"))`);
        await queryRunner.query(`CREATE TABLE "player_report" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "chosen_aspect" character varying NOT NULL, "reporter_steam_id" character varying NOT NULL, "reported_steam_id" character varying NOT NULL, "match_id" integer NOT NULL, CONSTRAINT "PK_b6b89a00ce08b7bac8b9e38d6eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE UNIQUE INDEX "PlayerReport_only_one_report_per_match_for_player_pair" ON "player_report" ("reporter_steam_id", "reported_steam_id", "match_id") `);
        await queryRunner.query(`CREATE TABLE "achievement_entity" ("steam_id" character varying NOT NULL, "achievement_key" smallint NOT NULL, "progress" integer NOT NULL DEFAULT '0', "matchId" integer, CONSTRAINT "PK_7b263b6d1c4cdc3a514b4418e54" PRIMARY KEY ("steam_id", "achievement_key"))`);
        await queryRunner.query(`CREATE TYPE "public"."matchmaking_mode_mapping_entity_patch_enum" AS ENUM('DOTA_684', 'DOTA_684_TURBO')`);
        await queryRunner.query(`CREATE TABLE "matchmaking_mode_mapping_entity" ("lobby_type" integer NOT NULL, "enabled" boolean NOT NULL, "dota_game_mode" integer NOT NULL, "dota_map" character varying NOT NULL DEFAULT 'dota', "fill_bots" boolean NOT NULL DEFAULT false, "patch" "public"."matchmaking_mode_mapping_entity_patch_enum" NOT NULL DEFAULT 'DOTA_684', "enable_cheats" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_b34628381e4190558a7b538a097" PRIMARY KEY ("lobby_type"))`);
        await queryRunner.query(`CREATE TABLE "player_ip_entity" ("steam_id" character varying NOT NULL, "ip" character varying NOT NULL, "interaction_type" character varying NOT NULL, CONSTRAINT "PK_a262e927193b28e7534401a4ff2" PRIMARY KEY ("steam_id", "ip"))`);
        await queryRunner.query(`CREATE TABLE "dodge_list_entry" ("steam_id" character varying NOT NULL, "dodged_steam_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9789fc55f3c47b5866813643b55" PRIMARY KEY ("steam_id", "dodged_steam_id"))`);
        await queryRunner.query(`ALTER TABLE "game_server_session_player" ADD CONSTRAINT "FK_2fa8dc8d4e837fc8df18d3bbfe9" FOREIGN KEY ("match_id") REFERENCES "game_server_session"("match_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "version_player" ADD CONSTRAINT "FK_e97fc93ff0270985f442d00def7" FOREIGN KEY ("season_id") REFERENCES "game_season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recalibration" ADD CONSTRAINT "FK_65d487501650b791c624afd37e2" FOREIGN KEY ("season_id") REFERENCES "game_season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "finished_match" ADD CONSTRAINT "FK_491273d87f6edad9c67f7fc2987" FOREIGN KEY ("season_id") REFERENCES "game_season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "player_in_match" ADD CONSTRAINT "FK_match_player" FOREIGN KEY ("matchId") REFERENCES "finished_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" ADD CONSTRAINT "FK_b949e76fd0ce751f3a5acd090c7" FOREIGN KEY ("matchId", "playerId") REFERENCES "player_in_match"("matchId","playerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" ADD CONSTRAINT "FK_match_achievement" FOREIGN KEY ("matchId") REFERENCES "finished_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" ADD CONSTRAINT "FK_0de7e474266d2cef32c4eea91ce" FOREIGN KEY ("matchId", "steam_id") REFERENCES "player_in_match"("matchId","playerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS WITH pm_agg AS
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
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","leaderboard_view","WITH pm_agg AS\n  (SELECT pim.\"playerId\" AS steam_id,\n          fm.season_id,\n          count(*) AS games,\n          count(*) FILTER ( WHERE fm.timestamp >= gs.start_timestamp) AS calibration_games,\n          count(*) FILTER (\n                           WHERE pim.team = fm.winner) AS wins,\n          count(*) FILTER (\n                           WHERE pim.abandoned) AS abandons,\n          avg(pim.kills) AS kills,\n          avg(pim.deaths) AS deaths,\n          avg(pim.assists) AS assists,\n          sum(fm.duration) AS play_time\n   FROM player_in_match pim\n   JOIN finished_match fm ON fm.id = pim.\"matchId\"\n   JOIN game_season gs ON gs.id = fm.season_id\n   WHERE fm.matchmaking_mode IN (0, 1)\n   GROUP BY pim.\"playerId\",\n            fm.season_id)\nSELECT vp.steam_id,\n       vp.season_id AS season_id,\n       vp.mmr::int,\n       games::int,\n       calibration_games::int,\n       wins::int,\n       abandons::int,\n       kills::float,\n       assists::float,\n       deaths::float,\n       play_time::int,\n       (ROW_NUMBER() OVER (PARTITION BY vp.season_id\n                          ORDER BY vp.mmr DESC))::int AS RANK,\n       (rc is not null and recalibration_attempted = 1)::boolean as recalibration_attempted\nFROM version_player vp\nJOIN pm_agg pa ON pa.steam_id = vp.steam_id\nAND pa.season_id = vp.season_id\nLEFT JOIN LATERAL\n  (SELECT 1 AS recalibration_attempted\n   FROM recalibration rc\n   WHERE rc.steam_id = vp.steam_id\n     AND rc.season_id = vp.season_id\n   LIMIT 1) rc ON true"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_view" AS 
WITH flat_items AS
  (SELECT pim."matchId",
          pim.team,
          unnest(array[pim.item0, pim.item1, pim.item2, pim.item3, pim.item4, pim.item5]) AS item_id
   FROM player_in_match pim
   JOIN finished_match fm ON fm.id = pim."matchId"
   WHERE fm.matchmaking_mode IN (0,
                                 1)),
     filtered_items AS
  (SELECT item_id,
          team,
          "matchId"
   FROM flat_items
   WHERE item_id <> 0),
     with_match AS
  (SELECT fi.*,
          fm.winner
   FROM filtered_items fi
   JOIN finished_match fm ON fm.id = fi."matchId"),
     item_stats AS
  (SELECT item_id,
          count(*)::integer AS games_played,
          sum((team = winner)::int)::integer AS wins,
          sum((team <> winner)::int)::integer AS loss
   FROM with_match
   GROUP BY item_id)
SELECT *,
       row_number() OVER (
                          ORDER BY games_played DESC)::integer AS popularity
FROM item_stats;
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_view","WITH flat_items AS\n  (SELECT pim.\"matchId\",\n          pim.team,\n          unnest(array[pim.item0, pim.item1, pim.item2, pim.item3, pim.item4, pim.item5]) AS item_id\n   FROM player_in_match pim\n   JOIN finished_match fm ON fm.id = pim.\"matchId\"\n   WHERE fm.matchmaking_mode IN (0,\n                                 1)),\n     filtered_items AS\n  (SELECT item_id,\n          team,\n          \"matchId\"\n   FROM flat_items\n   WHERE item_id <> 0),\n     with_match AS\n  (SELECT fi.*,\n          fm.winner\n   FROM filtered_items fi\n   JOIN finished_match fm ON fm.id = fi.\"matchId\"),\n     item_stats AS\n  (SELECT item_id,\n          count(*)::integer AS games_played,\n          sum((team = winner)::int)::integer AS wins,\n          sum((team <> winner)::int)::integer AS loss\n   FROM with_match\n   GROUP BY item_id)\nSELECT *,\n       row_number() OVER (\n                          ORDER BY games_played DESC)::integer AS popularity\nFROM item_stats;"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_hero_view" AS 
SELECT i.item_id,
       pim.hero,
       COUNT(*)::int AS played,
       SUM((pim.team = fm.winner)::int)::int AS wins
FROM player_in_match pim
CROSS JOIN LATERAL UNNEST(ARRAY[pim.item0, pim.item1, pim.item2, pim.item3, pim.item4, pim.item5]) AS u(item_id)
JOIN item_view i ON i.item_id = u.item_id
JOIN finished_match fm ON fm.id = pim."matchId"
WHERE fm.matchmaking_mode IN (0, 1)
GROUP BY pim.hero,
         i.item_id;
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_hero_view","SELECT i.item_id,\n       pim.hero,\n       COUNT(*)::int AS played,\n       SUM((pim.team = fm.winner)::int)::int AS wins\nFROM player_in_match pim\nCROSS JOIN LATERAL UNNEST(ARRAY[pim.item0, pim.item1, pim.item2, pim.item3, pim.item4, pim.item5]) AS u(item_id)\nJOIN item_view i ON i.item_id = u.item_id\nJOIN finished_match fm ON fm.id = pim.\"matchId\"\nWHERE fm.matchmaking_mode IN (0, 1)\nGROUP BY pim.hero,\n         i.item_id;"]);
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
        await queryRunner.query(`CREATE INDEX "IDX_07fed7963da996f578e8de9ba8" ON "leaderboard_view" ("mmr") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5a07d94e86fda68f9e1892b30" ON "leaderboard_view" ("games") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_ea58399f11e089d75e48bae37f" ON "leaderboard_view" ("steam_id", "season_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_b03a49c0a3b716841e067454a1" ON "item_view" ("item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a37d4b05f39499cb7cd35ac9d" ON "item_hero_view" ("item_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1a37d4b05f39499cb7cd35ac9d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b03a49c0a3b716841e067454a1"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_ea58399f11e089d75e48bae37f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d5a07d94e86fda68f9e1892b30"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_07fed7963da996f578e8de9ba8"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","mmr_bucket_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "mmr_bucket_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" DROP CONSTRAINT "FK_0de7e474266d2cef32c4eea91ce"`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" DROP CONSTRAINT "FK_match_achievement"`);
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" DROP CONSTRAINT "FK_b949e76fd0ce751f3a5acd090c7"`);
        await queryRunner.query(`ALTER TABLE "player_in_match" DROP CONSTRAINT "FK_match_player"`);
        await queryRunner.query(`ALTER TABLE "finished_match" DROP CONSTRAINT "FK_491273d87f6edad9c67f7fc2987"`);
        await queryRunner.query(`ALTER TABLE "recalibration" DROP CONSTRAINT "FK_65d487501650b791c624afd37e2"`);
        await queryRunner.query(`ALTER TABLE "version_player" DROP CONSTRAINT "FK_e97fc93ff0270985f442d00def7"`);
        await queryRunner.query(`ALTER TABLE "game_server_session_player" DROP CONSTRAINT "FK_2fa8dc8d4e837fc8df18d3bbfe9"`);
        await queryRunner.query(`DROP TABLE "dodge_list_entry"`);
        await queryRunner.query(`DROP TABLE "player_ip_entity"`);
        await queryRunner.query(`DROP TABLE "matchmaking_mode_mapping_entity"`);
        await queryRunner.query(`DROP TYPE "public"."matchmaking_mode_mapping_entity_patch_enum"`);
        await queryRunner.query(`DROP TABLE "achievement_entity"`);
        await queryRunner.query(`DROP INDEX "public"."PlayerReport_only_one_report_per_match_for_player_pair"`);
        await queryRunner.query(`DROP TABLE "player_report"`);
        await queryRunner.query(`DROP TABLE "player_report_status"`);
        await queryRunner.query(`DROP TABLE "mmr_change_log_entity"`);
        await queryRunner.query(`DROP INDEX "public"."player_match_index"`);
        await queryRunner.query(`DROP TABLE "player_in_match"`);
        await queryRunner.query(`DROP INDEX "public"."idx_finished_match_id_winner"`);
        await queryRunner.query(`DROP INDEX "public"."finished_match_matchmaking_mode_index"`);
        await queryRunner.query(`DROP INDEX "public"."match_timestamp_index"`);
        await queryRunner.query(`DROP TABLE "finished_match"`);
        await queryRunner.query(`DROP TYPE "public"."finished_match_region_enum"`);
        await queryRunner.query(`DROP TYPE "public"."finished_match_patch_enum"`);
        await queryRunner.query(`DROP TABLE "game_season"`);
        await queryRunner.query(`DROP TABLE "recalibration"`);
        await queryRunner.query(`DROP TABLE "version_player"`);
        await queryRunner.query(`DROP TABLE "player_crime_log_entity"`);
        await queryRunner.query(`DROP TABLE "game_server_model"`);
        await queryRunner.query(`DROP TABLE "game_server_session"`);
        await queryRunner.query(`DROP TABLE "game_server_session_player"`);
        await queryRunner.query(`DROP TABLE "match_entity"`);
        await queryRunner.query('DROP FUNCTION IF EXISTS function fantasy_score(pim player_in_match);')
    }

}
