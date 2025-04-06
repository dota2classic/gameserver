import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeBanTimeFieldType1743949044815 implements MigrationInterface {
    name = 'ChangeBanTimeFieldType1743949044815'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_crime_log_entity" DROP COLUMN "banTime"`);
        await queryRunner.query(`ALTER TABLE "player_crime_log_entity" ADD "banTime" bigint NOT NULL DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_crime_log_entity" DROP COLUMN "banTime"`);
        await queryRunner.query(`ALTER TABLE "player_crime_log_entity" ADD "banTime" integer NOT NULL DEFAULT '0'`);
    }

}
