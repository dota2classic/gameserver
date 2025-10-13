import { MigrationInterface, QueryRunner } from 'typeorm';

export class WinLoseStreak1751744274261 implements MigrationInterface {
    name = 'WinLoseStreak1751744274261'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" ADD "streak" integer NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" DROP COLUMN "streak"`);
    }

}
