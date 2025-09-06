import { MigrationInterface, QueryRunner } from 'typeorm';

export class ItemHeroViewFast1757178987960 implements MigrationInterface {
    name = 'ItemHeroViewFast1757178987960'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
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
        await queryRunner.query(`CREATE INDEX "IDX_1a37d4b05f39499cb7cd35ac9d" ON "item_hero_view" ("item_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_1a37d4b05f39499cb7cd35ac9d"`);
        await queryRunner.query(`DELETE FROM "typeorm_metadata" WHERE "type" = $1 AND "name" = $2 AND "schema" = $3`, ["MATERIALIZED_VIEW","item_hero_view","public"]);
        await queryRunner.query(`DROP MATERIALIZED VIEW "item_hero_view"`);
        await queryRunner.query(`CREATE MATERIALIZED VIEW "item_hero_view" AS SELECT i.item_id,
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
WHERE fm.matchmaking_mode in (0, 1)
GROUP BY pim_items.hero,
         i.item_id`);
        await queryRunner.query(`INSERT INTO "typeorm_metadata"("database", "schema", "table", "type", "name", "value") VALUES (DEFAULT, $1, DEFAULT, $2, $3, $4)`, ["public","MATERIALIZED_VIEW","item_hero_view","SELECT i.item_id,\n       pim_items.hero,\n       COUNT(*)::integer AS played,\n       SUM((pim_items.team = fm.winner)::int)::integer AS wins\nFROM\n  (SELECT DISTINCT pim.\"matchId\",\n                   pim.hero,\n                   pim.team,\n                   item_id\n   FROM player_in_match pim,\n        LATERAL\n     (SELECT DISTINCT unnest_item AS item_id\n      FROM unnest(array[item0, item1, item2, item3, item4, item5]) AS unnest_item) AS item_unnested) pim_items\nJOIN item_view i ON i.item_id = pim_items.item_id\nJOIN finished_match fm ON fm.id = pim_items.\"matchId\"\nWHERE fm.matchmaking_mode in (0, 1)\nGROUP BY pim_items.hero,\n         i.item_id"]);
    }

}
