import { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1739895260195 implements MigrationInterface {
    name = 'Initial1739895260195'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "match_entity" ("id" SERIAL NOT NULL, "started" boolean NOT NULL DEFAULT false, "finished" boolean NOT NULL DEFAULT true, "server" character varying NOT NULL, "mode" integer NOT NULL, "matchInfoJson" text, CONSTRAINT "PK_4378e339adc7bd7c80f938afd9c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "game_server_session_player" ("steam_id" character varying NOT NULL, "match_id" integer NOT NULL, "party_id" character varying NOT NULL, "team" integer NOT NULL, "connection_state" integer NOT NULL, "abandoned" boolean NOT NULL DEFAULT false, CONSTRAINT "PK_d86cef8868beb8c4bb677a7830b" PRIMARY KEY ("steam_id", "match_id"))`);
        await queryRunner.query(`CREATE TABLE "game_server_session" ("match_id" integer NOT NULL, "server_url" character varying NOT NULL, "room_id" character varying NOT NULL, "matchmaking_mode" integer NOT NULL, "game_mode" integer NOT NULL, "map" character varying NOT NULL, "game_state" integer NOT NULL, "duration" integer NOT NULL DEFAULT '0', "timestamp" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_f3e4ca88b4333c46b52c0851094" PRIMARY KEY ("match_id"))`);
        await queryRunner.query(`CREATE TABLE "game_server_model" ("url" character varying NOT NULL, "version" character varying NOT NULL DEFAULT 'Dota_681', CONSTRAINT "PK_8fe2dd5600020337bc94d7b1e6c" PRIMARY KEY ("url"))`);
        await queryRunner.query(`CREATE TABLE "player_crime_log_entity" ("id" SERIAL NOT NULL, "steam_id" character varying NOT NULL, "crime" integer NOT NULL, "match_id" integer, "lobby_type" integer, "handled" boolean NOT NULL DEFAULT false, "banTime" integer NOT NULL DEFAULT '0', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_fc97a11fe0efd50ef516dc2a6df" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "finished_match" ("winner" smallint NOT NULL, "id" integer NOT NULL, "game_mode" smallint NOT NULL, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "matchmaking_mode" smallint NOT NULL, "server" character varying, "duration" integer NOT NULL DEFAULT '0', "externalMatchId" integer, CONSTRAINT "PK_d245682bfe9e61b5dc6707802bb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "match_timestamp_index" ON "finished_match" ("timestamp") `);
        await queryRunner.query(`CREATE INDEX "finished_match_matchmaking_mode_index" ON "finished_match" ("matchmaking_mode") `);
        await queryRunner.query(`CREATE TABLE "player_in_match" ("playerId" character varying NOT NULL, "matchId" integer NOT NULL, "team" integer NOT NULL, "kills" integer NOT NULL, "deaths" integer NOT NULL, "assists" integer NOT NULL, "level" integer NOT NULL, "gpm" integer NOT NULL DEFAULT '0', "xpm" integer NOT NULL DEFAULT '0', "hero_damage" integer NOT NULL DEFAULT '0', "tower_damage" integer NOT NULL DEFAULT '0', "hero_healing" integer NOT NULL DEFAULT '0', "abandoned" boolean NOT NULL DEFAULT false, "last_hits" integer NOT NULL DEFAULT '0', "denies" integer NOT NULL DEFAULT '0', "gold" integer NOT NULL DEFAULT '0', "hero" character varying NOT NULL, "item0" smallint NOT NULL DEFAULT '0', "item1" smallint NOT NULL DEFAULT '0', "item2" smallint NOT NULL DEFAULT '0', "item3" smallint NOT NULL DEFAULT '0', "item4" smallint NOT NULL DEFAULT '0', "item5" smallint NOT NULL DEFAULT '0', "party_id" uuid, CONSTRAINT "PK_pim_player_match_idx" PRIMARY KEY ("playerId", "matchId"))`);
        await queryRunner.query(`CREATE INDEX "player_match_index" ON "player_in_match" ("matchId") `);
        await queryRunner.query(`CREATE TABLE "mmr_change_log_entity" ("playerId" character varying NOT NULL, "matchId" integer NOT NULL, "winner" boolean NOT NULL, "winnerAverage" double precision NOT NULL, "loserAverage" double precision NOT NULL, "mmrBefore" double precision NOT NULL, "mmrAfter" double precision NOT NULL, "hiddenMmr" boolean NOT NULL DEFAULT false, "change" double precision NOT NULL, CONSTRAINT "PK_b949e76fd0ce751f3a5acd090c7" PRIMARY KEY ("playerId", "matchId"))`);
        await queryRunner.query(`CREATE TABLE "game_season" ("id" integer NOT NULL, "version" character varying NOT NULL, "start_timestamp" TIMESTAMP NOT NULL, CONSTRAINT "PK_7b482abb67e210080a41d5c5d0c" PRIMARY KEY ("id", "version"))`);
        await queryRunner.query(`CREATE TABLE "version_player" ("steam_id" character varying NOT NULL, "version" character varying NOT NULL, "mmr" integer NOT NULL DEFAULT '2500', "hidden_mmr" integer NOT NULL DEFAULT '2500', CONSTRAINT "PK_0f464da72d7dd09c6a947c82af3" PRIMARY KEY ("steam_id", "version"))`);
        await queryRunner.query(`CREATE TABLE "player_ban" ("steam_id" character varying NOT NULL, "endTime" TIMESTAMP WITH TIME ZONE NOT NULL, "reason" integer NOT NULL, CONSTRAINT "PK_ba50bbc64c84c0ba39568d14599" PRIMARY KEY ("steam_id"))`);
        await queryRunner.query(`CREATE TABLE "player_report_status" ("steam_id" character varying NOT NULL, "updatedWithMatch" integer, "reports" integer NOT NULL DEFAULT '1', CONSTRAINT "PK_f6d263eee3bfb2a6e2c0c660b85" PRIMARY KEY ("steam_id"))`);
        await queryRunner.query(`CREATE TABLE "player_report" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "reporter" character varying NOT NULL, "reported" character varying NOT NULL, "text" character varying NOT NULL, "matchId" integer NOT NULL, CONSTRAINT "PK_b6b89a00ce08b7bac8b9e38d6eb" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "achievement_entity" ("steam_id" character varying NOT NULL, "achievement_key" smallint NOT NULL, "progress" integer NOT NULL DEFAULT '0', "matchId" integer, "hero" character varying, CONSTRAINT "PK_7b263b6d1c4cdc3a514b4418e54" PRIMARY KEY ("steam_id", "achievement_key"))`);
        await queryRunner.query(`CREATE TABLE "matchmaking_mode_mapping_entity" ("lobby_type" integer NOT NULL, "enabled" boolean NOT NULL, "dota_game_mode" integer NOT NULL, "dota_map" character varying NOT NULL DEFAULT 'dota', CONSTRAINT "PK_b34628381e4190558a7b538a097" PRIMARY KEY ("lobby_type"))`);
        await queryRunner.query(`CREATE TABLE "player_ip_entity" ("steam_id" character varying NOT NULL, "ip" character varying NOT NULL, "interaction_type" character varying NOT NULL, CONSTRAINT "PK_a262e927193b28e7534401a4ff2" PRIMARY KEY ("steam_id", "ip"))`);
        await queryRunner.query(`ALTER TABLE "game_server_session_player" ADD CONSTRAINT "FK_2fa8dc8d4e837fc8df18d3bbfe9" FOREIGN KEY ("match_id") REFERENCES "game_server_session"("match_id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "player_in_match" ADD CONSTRAINT "FK_match_player" FOREIGN KEY ("matchId") REFERENCES "finished_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" ADD CONSTRAINT "FK_b949e76fd0ce751f3a5acd090c7" FOREIGN KEY ("matchId", "playerId") REFERENCES "player_in_match"("matchId","playerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" ADD CONSTRAINT "FK_match_achievement" FOREIGN KEY ("matchId") REFERENCES "finished_match"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" ADD CONSTRAINT "FK_0de7e474266d2cef32c4eea91ce" FOREIGN KEY ("matchId", "steam_id") REFERENCES "player_in_match"("matchId","playerId") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "leaderboard_view" AS with cte as (select plr."playerId"                                                                   as steam_id,
                    count(*)::int                                                                    as any_games,
                    sum((m.winner = plr.team)::int)::int                                             as bot_wins,
                    sum((m.matchmaking_mode in (0, 1))::int)::int                                    as games,
                    sum((m.winner = plr.team and m.matchmaking_mode in (0, 1))::int)::int            as wins,
                    sum((m.matchmaking_mode = 0 and m.timestamp > now() - '14 days'::interval)::int) as recent_ranked_games,
                    coalesce(p.hidden_mmr, -1)                                                       as mmr
             from player_in_match plr
                      left join version_player p on plr."playerId" = p.steam_id
                      inner join finished_match m on plr."matchId" = m.id
             group by plr."playerId", p.hidden_mmr)
select p.steam_id,
       p.wins,
       p.games,
       p.any_games,
       p.bot_wins,
       p.mmr                                                                        as mmr,
       avg(pim.kills)::float                                                        as kills,
       avg(pim.deaths)::float                                                       as deaths,
       avg(pim.assists)::float                                                      as assists,
       sum(m.duration)::int                                                         as play_time,
       sum((m.matchmaking_mode in (0, 1))::int)                                     as ranked_games,
       (row_number() over ( order by p.mmr desc))::int                              as rank
from cte p
         inner join player_in_match pim on pim."playerId" = p.steam_id
         inner join finished_match m on pim."matchId" = m.id
group by p.steam_id, p.recent_ranked_games, p.mmr, p.games, p.wins, p.any_games, p.bot_wins
order by rank, games desc`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["kekus","MATERIALIZED_VIEW","leaderboard_view","with cte as (select plr.\"playerId\"                                                                   as steam_id,\n                    count(*)::int                                                                    as any_games,\n                    sum((m.winner = plr.team)::int)::int                                             as bot_wins,\n                    sum((m.matchmaking_mode in (0, 1))::int)::int                                    as games,\n                    sum((m.winner = plr.team and m.matchmaking_mode in (0, 1))::int)::int            as wins,\n                    sum((m.matchmaking_mode = 0 and m.timestamp > now() - '14 days'::interval)::int) as recent_ranked_games,\n                    coalesce(p.hidden_mmr, -1)                                                       as mmr\n             from player_in_match plr\n                      left join version_player p on plr.\"playerId\" = p.steam_id\n                      inner join finished_match m on plr.\"matchId\" = m.id\n             group by plr.\"playerId\", p.hidden_mmr)\nselect p.steam_id,\n       p.wins,\n       p.games,\n       p.any_games,\n       p.bot_wins,\n       p.mmr                                                                        as mmr,\n       avg(pim.kills)::float                                                        as kills,\n       avg(pim.deaths)::float                                                       as deaths,\n       avg(pim.assists)::float                                                      as assists,\n       sum(m.duration)::int                                                         as play_time,\n       sum((m.matchmaking_mode in (0, 1))::int)                                     as ranked_games,\n       (row_number() over ( order by p.mmr desc))::int                              as rank\nfrom cte p\n         inner join player_in_match pim on pim.\"playerId\" = p.steam_id\n         inner join finished_match m on pim.\"matchId\" = m.id\ngroup by p.steam_id, p.recent_ranked_games, p.mmr, p.games, p.wins, p.any_games, p.bot_wins\norder by rank, games desc"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_view" AS with items as (select pim.item0 as item_id
               from player_in_match pim
               union
               select pim.item1
               from player_in_match pim
               union
               select pim.item2
               from player_in_match pim
               union
               select pim.item3
               from player_in_match pim
               union
               select pim.item4
               from player_in_match pim
               union
               select pim.item5
               from player_in_match pim)
select items.item_id                                       as item_id,
       count(pim)::int                                     as games_played,
       sum((pim.team = fm.winner)::int)::int               as wins,
       sum((pim.team != fm.winner)::int)::int              as loss,
       (row_number() over (order by count(pim) desc))::int as popularity
from items
         left join player_in_match pim
                   on pim.item0 = items.item_id or pim.item1 = items.item_id or pim.item2 = items.item_id or
                      pim.item3 = items.item_id or pim.item4 = items.item_id or pim.item5 = items.item_id
         inner join finished_match fm on fm.id = pim."matchId" and fm.matchmaking_mode in (0, 1)
where items.item_id != 0
group by items.item_id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["kekus","MATERIALIZED_VIEW","item_view","with items as (select pim.item0 as item_id\n               from player_in_match pim\n               union\n               select pim.item1\n               from player_in_match pim\n               union\n               select pim.item2\n               from player_in_match pim\n               union\n               select pim.item3\n               from player_in_match pim\n               union\n               select pim.item4\n               from player_in_match pim\n               union\n               select pim.item5\n               from player_in_match pim)\nselect items.item_id                                       as item_id,\n       count(pim)::int                                     as games_played,\n       sum((pim.team = fm.winner)::int)::int               as wins,\n       sum((pim.team != fm.winner)::int)::int              as loss,\n       (row_number() over (order by count(pim) desc))::int as popularity\nfrom items\n         left join player_in_match pim\n                   on pim.item0 = items.item_id or pim.item1 = items.item_id or pim.item2 = items.item_id or\n                      pim.item3 = items.item_id or pim.item4 = items.item_id or pim.item5 = items.item_id\n         inner join finished_match fm on fm.id = pim.\"matchId\" and fm.matchmaking_mode in (0, 1)\nwhere items.item_id != 0\ngroup by items.item_id"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_hero_view" AS 
select i.item_id as item_id, pim.hero as hero, count(pim)::int as played, sum((pim.team = fm.winner)::int)::int as wins
from item_view i
         left join player_in_match pim
                   on pim.item0 = i.item_id
                       or pim.item1 = i.item_id
                       or pim.item2 = i.item_id
                       or pim.item3 = i.item_id
                       or pim.item4 = i.item_id
                       or pim.item5 = i.item_id
         inner join finished_match fm on fm.id = pim."matchId"
group by pim.hero, i.item_id
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["kekus","MATERIALIZED_VIEW","item_hero_view","select i.item_id as item_id, pim.hero as hero, count(pim)::int as played, sum((pim.team = fm.winner)::int)::int as wins\nfrom item_view i\n         left join player_in_match pim\n                   on pim.item0 = i.item_id\n                       or pim.item1 = i.item_id\n                       or pim.item2 = i.item_id\n                       or pim.item3 = i.item_id\n                       or pim.item4 = i.item_id\n                       or pim.item5 = i.item_id\n         inner join finished_match fm on fm.id = pim.\"matchId\"\ngroup by pim.hero, i.item_id"]);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_e8c7c5db9c88413214a6ee58c9" ON "leaderboard_view" ("steam_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_07fed7963da996f578e8de9ba8" ON "leaderboard_view" ("mmr") `);
        await queryRunner.query(`CREATE INDEX "IDX_d5a07d94e86fda68f9e1892b30" ON "leaderboard_view" ("games") `);
        await queryRunner.query(`CREATE INDEX "IDX_b03a49c0a3b716841e067454a1" ON "item_view" ("item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a37d4b05f39499cb7cd35ac9d" ON "item_hero_view" ("item_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_1a37d4b05f39499cb7cd35ac9d"`);
        await queryRunner.query(`DROP INDEX "IDX_b03a49c0a3b716841e067454a1"`);
        await queryRunner.query(`DROP INDEX "IDX_d5a07d94e86fda68f9e1892b30"`);
        await queryRunner.query(`DROP INDEX "IDX_07fed7963da996f578e8de9ba8"`);
        await queryRunner.query(`DROP INDEX "IDX_e8c7c5db9c88413214a6ee58c9"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","kekus"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_view","kekus"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","leaderboard_view","kekus"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "leaderboard_view"`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" DROP CONSTRAINT "FK_0de7e474266d2cef32c4eea91ce"`);
        await queryRunner.query(`ALTER TABLE "achievement_entity" DROP CONSTRAINT "FK_match_achievement"`);
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" DROP CONSTRAINT "FK_b949e76fd0ce751f3a5acd090c7"`);
        await queryRunner.query(`ALTER TABLE "player_in_match" DROP CONSTRAINT "FK_match_player"`);
        await queryRunner.query(`ALTER TABLE "game_server_session_player" DROP CONSTRAINT "FK_2fa8dc8d4e837fc8df18d3bbfe9"`);
        await queryRunner.query(`DROP TABLE "player_ip_entity"`);
        await queryRunner.query(`DROP TABLE "matchmaking_mode_mapping_entity"`);
        await queryRunner.query(`DROP TABLE "achievement_entity"`);
        await queryRunner.query(`DROP TABLE "player_report"`);
        await queryRunner.query(`DROP TABLE "player_report_status"`);
        await queryRunner.query(`DROP TABLE "player_ban"`);
        await queryRunner.query(`DROP TABLE "version_player"`);
        await queryRunner.query(`DROP TABLE "game_season"`);
        await queryRunner.query(`DROP TABLE "mmr_change_log_entity"`);
        await queryRunner.query(`DROP INDEX "player_match_index"`);
        await queryRunner.query(`DROP TABLE "player_in_match"`);
        await queryRunner.query(`DROP INDEX "finished_match_matchmaking_mode_index"`);
        await queryRunner.query(`DROP INDEX "match_timestamp_index"`);
        await queryRunner.query(`DROP TABLE "finished_match"`);
        await queryRunner.query(`DROP TABLE "player_crime_log_entity"`);
        await queryRunner.query(`DROP TABLE "game_server_model"`);
        await queryRunner.query(`DROP TABLE "game_server_session"`);
        await queryRunner.query(`DROP TABLE "game_server_session_player"`);
        await queryRunner.query(`DROP TABLE "match_entity"`);
    }

}
