import { MigrationInterface, QueryRunner } from 'typeorm';

export class PimFieldAndMmrChangeLog1747837239631 implements MigrationInterface {
    name = 'PimFieldAndMmrChangeLog1747837239631'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_in_match" RENAME COLUMN "party_id" TO "party_index"`);
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" ADD "calibration_game" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`UPDATE "mmr_change_log_entity" SET "calibration_game" = true WHERE ABS(change) > 45`);
        await queryRunner.query(`ALTER TABLE "player_in_match" DROP COLUMN "party_index"`);
        await queryRunner.query(`ALTER TABLE "player_in_match" ADD "party_index" integer`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_in_match" DROP COLUMN "party_index"`);
        await queryRunner.query(`ALTER TABLE "player_in_match" ADD "party_index" uuid`);
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" DROP COLUMN "calibration_game"`);
        await queryRunner.query(`ALTER TABLE "player_in_match" RENAME COLUMN "party_index" TO "party_id"`);
    }

}
