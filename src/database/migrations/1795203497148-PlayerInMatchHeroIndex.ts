import { MigrationInterface, QueryRunner } from "typeorm";

const INDEX = "player_in_match_hero_idx";

export class PlayerInMatchHeroIndex1795203497148 implements MigrationInterface {
  name = "PlayerInMatchHeroIndex1795203497148";
  public transaction = false;

  public async up(queryRunner: QueryRunner): Promise<void> {
    const invalid = await queryRunner.query(
      `SELECT 1 FROM pg_index i INNER JOIN pg_class c ON c.oid = i.indexrelid WHERE c.relname = $1 AND NOT i.indisvalid`,
      [INDEX],
    );
    if (invalid.length > 0) {
      await queryRunner.query(`DROP INDEX CONCURRENTLY IF EXISTS "${INDEX}"`);
    }
    await queryRunner.query(
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${INDEX}" ON "player_in_match" ("hero", "matchId")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "${INDEX}"`);
  }
}
