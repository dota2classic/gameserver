import { MigrationInterface, QueryRunner } from 'typeorm';

export class VPDropVersion1740439548267 implements MigrationInterface {
    name = 'VPDropVersion1740439548267'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" DROP CONSTRAINT "PK_0f464da72d7dd09c6a947c82af3"`);
        await queryRunner.query(`ALTER TABLE "version_player" ADD CONSTRAINT "PK_0337275dce0b75999cd217016ac" PRIMARY KEY ("steam_id")`);
        await queryRunner.query(`ALTER TABLE "version_player" DROP COLUMN "version"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" ADD "version" character varying NOT NULL DEFAULT 'Dota_684'`);
        await queryRunner.query(`ALTER TABLE "version_player" DROP CONSTRAINT "PK_0337275dce0b75999cd217016ac"`);
        await queryRunner.query(`ALTER TABLE "version_player" ADD CONSTRAINT "PK_0f464da72d7dd09c6a947c82af3" PRIMARY KEY ("steam_id", "version")`);
    }

}
