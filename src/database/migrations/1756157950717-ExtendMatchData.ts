import { MigrationInterface, QueryRunner } from 'typeorm';

export class ExtendMatchData1756157950717 implements MigrationInterface {
  name = "ExtendMatchData1756157950717";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "finished_match" ADD "tower_status" integer array NOT NULL DEFAULT '{0,0}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "finished_match" ADD "barrack_status" integer array NOT NULL DEFAULT '{0,0}'`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_in_match" ADD "bear" integer array`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_in_match" ADD "support_gold" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_in_match" ADD "support_ability_value" integer NOT NULL DEFAULT '0'`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_in_match" ADD "misses" integer NOT NULL DEFAULT '0'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "player_in_match" DROP COLUMN "misses"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_in_match" DROP COLUMN "support_ability_value"`,
    );
    await queryRunner.query(
      `ALTER TABLE "player_in_match" DROP COLUMN "support_gold"`,
    );
    await queryRunner.query(`ALTER TABLE "player_in_match" DROP COLUMN "bear"`);
    await queryRunner.query(
      `ALTER TABLE "finished_match" DROP COLUMN "barrack_status"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finished_match" DROP COLUMN "tower_status"`,
    );
  }
}
