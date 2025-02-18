import { MigrationInterface, QueryRunner } from 'typeorm';

export class MmrChangeLogPlayerPerformance1739918508031 implements MigrationInterface {
    name = 'MmrChangeLogPlayerPerformance1739918508031'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" ADD "player_performance_coefficient" double precision NOT NULL DEFAULT '1'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "mmr_change_log_entity" DROP COLUMN "player_performance_coefficient"`);
    }

}
