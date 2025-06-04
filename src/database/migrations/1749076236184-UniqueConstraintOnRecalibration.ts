import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueConstraintOnRecalibration1749076236184 implements MigrationInterface {
    name = 'UniqueConstraintOnRecalibration1749076236184'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recalibration" ADD CONSTRAINT "one_recalibration_per_season" UNIQUE ("steam_id", "season_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recalibration" DROP CONSTRAINT "one_recalibration_per_season"`);
    }

}
