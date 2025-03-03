import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinishedMatchSeasonId1740992098104 implements MigrationInterface {
    name = 'FinishedMatchSeasonId1740992098104'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finished_match" ADD "season_id" integer NOT NULL DEFAULT 1`);
        await queryRunner.query(`ALTER TABLE "finished_match" ADD CONSTRAINT "FK_491273d87f6edad9c67f7fc2987" FOREIGN KEY ("season_id") REFERENCES "game_season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finished_match" DROP CONSTRAINT "PK_188b8d927911903206dfa11c2c4"`);
        await queryRunner.query(`ALTER TABLE "finished_match" DROP COLUMN "season_id"`);
    }

}
