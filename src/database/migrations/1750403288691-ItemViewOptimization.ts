import { MigrationInterface, QueryRunner } from 'typeorm';

export class ItemViewOptimization1750403288691 implements MigrationInterface {
    name = 'ItemViewOptimization1750403288691'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_view"`);
        await queryRunner.query(`ALTER TABLE "version_player" ALTER COLUMN "mmr" SET DEFAULT '1000'`);
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
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_hero_view","select i.item_id as item_id, pim.hero as hero, count(pim)::int as played, sum((pim.team = fm.winner)::int)::int as wins\nfrom item_view i\n         left join player_in_match pim\n                   on pim.item0 = i.item_id\n                       or pim.item1 = i.item_id\n                       or pim.item2 = i.item_id\n                       or pim.item3 = i.item_id\n                       or pim.item4 = i.item_id\n                       or pim.item5 = i.item_id\n         inner join finished_match fm on fm.id = pim.\"matchId\"\ngroup by pim.hero, i.item_id"]);
        await queryRunner.query(`CREATE INDEX "IDX_b03a49c0a3b716841e067454a1" ON "item_view" ("item_id") `);
        await queryRunner.query(`CREATE INDEX "IDX_1a37d4b05f39499cb7cd35ac9d" ON "item_hero_view" ("item_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1a37d4b05f39499cb7cd35ac9d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_b03a49c0a3b716841e067454a1"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_view"`);
        await queryRunner.query(`ALTER TABLE "version_player" ALTER COLUMN "mmr" SET DEFAULT '2500'`);
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
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_view","with items as (select pim.item0 as item_id\n               from player_in_match pim\n               union\n               select pim.item1\n               from player_in_match pim\n               union\n               select pim.item2\n               from player_in_match pim\n               union\n               select pim.item3\n               from player_in_match pim\n               union\n               select pim.item4\n               from player_in_match pim\n               union\n               select pim.item5\n               from player_in_match pim)\nselect items.item_id                                       as item_id,\n       count(pim)::int                                     as games_played,\n       sum((pim.team = fm.winner)::int)::int               as wins,\n       sum((pim.team != fm.winner)::int)::int              as loss,\n       (row_number() over (order by count(pim) desc))::int as popularity\nfrom items\n         left join player_in_match pim\n                   on pim.item0 = items.item_id or pim.item1 = items.item_id or pim.item2 = items.item_id or\n                      pim.item3 = items.item_id or pim.item4 = items.item_id or pim.item5 = items.item_id\n         inner join finished_match fm on fm.id = pim.\"matchId\" and fm.matchmaking_mode in (0, 1)\nwhere items.item_id != 0\ngroup by items.item_id"]);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_hero_view" AS select i.item_id as item_id, pim.hero as hero, count(pim)::int as played, sum((pim.team = fm.winner)::int)::int as wins
from item_view i
         left join player_in_match pim
                   on pim.item0 = i.item_id
                       or pim.item1 = i.item_id
                       or pim.item2 = i.item_id
                       or pim.item3 = i.item_id
                       or pim.item4 = i.item_id
                       or pim.item5 = i.item_id
         inner join finished_match fm on fm.id = pim."matchId"
group by pim.hero, i.item_id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_hero_view","select i.item_id as item_id, pim.hero as hero, count(pim)::int as played, sum((pim.team = fm.winner)::int)::int as wins\nfrom item_view i\n         left join player_in_match pim\n                   on pim.item0 = i.item_id\n                       or pim.item1 = i.item_id\n                       or pim.item2 = i.item_id\n                       or pim.item3 = i.item_id\n                       or pim.item4 = i.item_id\n                       or pim.item5 = i.item_id\n         inner join finished_match fm on fm.id = pim.\"matchId\"\ngroup by pim.hero, i.item_id"]);
    }

}
