import { MigrationInterface, QueryRunner } from 'typeorm';

export class PlayerReportStatusSummaryTimestmap1745356184029 implements MigrationInterface {
    name = 'PlayerReportStatusSummaryTimestmap1745356184029'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report_status" ADD "report_summary_timestamp" TIMESTAMP WITH TIME ZONE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report_status" DROP COLUMN "report_summary_timestamp"`);
    }

}
