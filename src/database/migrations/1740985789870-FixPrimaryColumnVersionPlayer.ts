import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixPrimaryColumnVersionPlayer1740985789870 implements MigrationInterface {
    name = 'FixPrimaryColumnVersionPlayer1740985789870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" DROP CONSTRAINT "PK_0337275dce0b75999cd217016ac"`);
        await queryRunner.query(`ALTER TABLE "version_player" ADD CONSTRAINT "PK_c5bb833217213a511320db60531" PRIMARY KEY ("steam_id", "season_id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" DROP CONSTRAINT "PK_c5bb833217213a511320db60531"`);
        await queryRunner.query(`ALTER TABLE "version_player" ADD CONSTRAINT "PK_0337275dce0b75999cd217016ac" PRIMARY KEY ("steam_id")`);
    }

}
