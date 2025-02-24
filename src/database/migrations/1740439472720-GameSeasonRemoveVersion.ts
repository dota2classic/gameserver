import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameSeasonRemoveVersion1740439472720 implements MigrationInterface {
    name = 'GameSeasonRemoveVersion1740439472720'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_season" DROP CONSTRAINT "PK_7b482abb67e210080a41d5c5d0c"`);
        await queryRunner.query(`ALTER TABLE "game_season" ADD CONSTRAINT "PK_ac3e643ed10f10a45e826c8e20e" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "game_season" DROP COLUMN "version"`);
        await queryRunner.query(`ALTER TABLE "version_player" ALTER COLUMN "version" SET DEFAULT 'Dota_684'`);
        await queryRunner.query(`ALTER TABLE "version_player" ADD CONSTRAINT "FK_e97fc93ff0270985f442d00def7" FOREIGN KEY ("season_id") REFERENCES "game_season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "version_player" DROP CONSTRAINT "FK_e97fc93ff0270985f442d00def7"`);
        await queryRunner.query(`ALTER TABLE "version_player" ALTER COLUMN "version" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "game_season" ADD "version" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "game_season" DROP CONSTRAINT "PK_ac3e643ed10f10a45e826c8e20e"`);
        await queryRunner.query(`ALTER TABLE "game_season" ADD CONSTRAINT "PK_7b482abb67e210080a41d5c5d0c" PRIMARY KEY ("id", "version")`);
    }

}
