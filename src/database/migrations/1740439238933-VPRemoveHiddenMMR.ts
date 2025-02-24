import { MigrationInterface, QueryRunner } from 'typeorm';

export class VPRemoveHiddenMMR1740439238933 implements MigrationInterface {
    name = 'VPRemoveHiddenMMR1740439238933'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" DROP COLUMN "mmr"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" ADD COLUMN "mmr" integer NOT NULL DEFAULT 2500`);
    }

}
