import { MigrationInterface, QueryRunner } from 'typeorm';

export class VPAddSeasonId1740439202237 implements MigrationInterface {
    name = 'VPAddSeasonId1740439202237'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" ADD "season_id" integer NOT NULL DEFAULT 1`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" DROP COLUMN "season_id"`);
    }

}
