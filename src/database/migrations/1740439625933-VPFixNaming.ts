import { MigrationInterface, QueryRunner } from 'typeorm';

export class VPFixNaming1740439625933 implements MigrationInterface {
    name = 'VPFixNaming1740439625933'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" RENAME COLUMN "hidden_mmr" TO "mmr"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" RENAME COLUMN "mmr" TO "hidden_mmr"`);
    }

}
