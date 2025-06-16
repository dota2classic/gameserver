import { MigrationInterface, QueryRunner } from 'typeorm';

export class NewAspect1749978560063 implements MigrationInterface {
    name = 'NewAspect1749978560063'

    public async up(queryRunner: QueryRunner): Promise<void> {

        await queryRunner.query(`DELETE FROM "player_report"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "chosen_aspect"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "chosen_aspect" character varying NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "chosen_aspect"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "chosen_aspect" integer NOT NULL`);
    }

}
