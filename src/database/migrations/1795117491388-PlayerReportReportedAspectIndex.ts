import { MigrationInterface, QueryRunner } from "typeorm";

const INDEX = "IDX_player_report_reported_steam_id_chosen_aspect";

export class PlayerReportReportedAspectIndex1795117491388
  implements MigrationInterface
{
  name = "PlayerReportReportedAspectIndex1795117491388";
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
      `CREATE INDEX CONCURRENTLY IF NOT EXISTS "${INDEX}" ON "player_report" ("reported_steam_id", "chosen_aspect")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "${INDEX}"`);
  }
}
