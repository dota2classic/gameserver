import { MigrationInterface, QueryRunner } from 'typeorm';

export class ItemHeroViewOptimization1750409882070 implements MigrationInterface {
    name = 'ItemHeroViewOptimization1750409882070'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_hero_view" AS 
SELECT i.item_id,
       pim_items.hero,
       COUNT(*)::integer AS played,
       SUM((pim_items.team = fm.winner)::int)::integer AS wins
FROM
  (SELECT DISTINCT pim."matchId",
                   pim.hero,
                   pim.team,
                   item_id
   FROM player_in_match pim,
        LATERAL
     (SELECT DISTINCT unnest_item AS item_id
      FROM unnest(array[item0, item1, item2, item3, item4, item5]) AS unnest_item) AS item_unnested) pim_items
JOIN item_view i ON i.item_id = pim_items.item_id
JOIN finished_match fm ON fm.id = pim_items."matchId"
GROUP BY pim_items.hero,
         i.item_id
`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_hero_view","SELECT i.item_id,\n       pim_items.hero,\n       COUNT(*)::integer AS played,\n       SUM((pim_items.team = fm.winner)::int)::integer AS wins\nFROM\n  (SELECT DISTINCT pim.\"matchId\",\n                   pim.hero,\n                   pim.team,\n                   item_id\n   FROM player_in_match pim,\n        LATERAL\n     (SELECT DISTINCT unnest_item AS item_id\n      FROM unnest(array[item0, item1, item2, item3, item4, item5]) AS unnest_item) AS item_unnested) pim_items\nJOIN item_view i ON i.item_id = pim_items.item_id\nJOIN finished_match fm ON fm.id = pim_items.\"matchId\"\nGROUP BY pim_items.hero,\n         i.item_id"]);
        await queryRunner.query(`CREATE INDEX "IDX_1a37d4b05f39499cb7cd35ac9d" ON "item_hero_view" ("item_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1a37d4b05f39499cb7cd35ac9d"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
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
