import { MigrationInterface, QueryRunner } from 'typeorm';

export class Recalibration1749072084985 implements MigrationInterface {
    name = 'Recalibration1749072084985'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "recalibration" ("id" SERIAL NOT NULL, "steam_id" character varying NOT NULL, "season_id" integer NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_e9de0b0728b553b8f6372a4eb2c" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "recalibration" ADD CONSTRAINT "FK_65d487501650b791c624afd37e2" FOREIGN KEY ("season_id") REFERENCES "game_season"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "recalibration" DROP CONSTRAINT "FK_65d487501650b791c624afd37e2"`);
        await queryRunner.query(`DROP TABLE "recalibration"`);
    }

}
