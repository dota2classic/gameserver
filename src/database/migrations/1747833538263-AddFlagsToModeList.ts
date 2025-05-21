import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFlagsToModeList1747833538263 implements MigrationInterface {
    name = 'AddFlagsToModeList1747833538263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matchmaking_mode_mapping_entity" ADD "fill_bots" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "matchmaking_mode_mapping_entity" ADD "enable_cheats" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matchmaking_mode_mapping_entity" DROP COLUMN "enable_cheats"`);
        await queryRunner.query(`ALTER TABLE "matchmaking_mode_mapping_entity" DROP COLUMN "fill_bots"`);
    }

}
