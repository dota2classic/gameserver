import { MigrationInterface, QueryRunner } from 'typeorm';

export class Patch1754987826441 implements MigrationInterface {
    name = 'Patch1754987826441'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."matchmaking_mode_mapping_entity_patch_enum" AS ENUM('DOTA_684', 'DOTA_684_TURBO')`);
        await queryRunner.query(`ALTER TABLE "matchmaking_mode_mapping_entity" ADD "patch" "public"."matchmaking_mode_mapping_entity_patch_enum" NOT NULL DEFAULT 'DOTA_684'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "matchmaking_mode_mapping_entity" DROP COLUMN "patch"`);
        await queryRunner.query(`DROP TYPE "public"."matchmaking_mode_mapping_entity_patch_enum"`);
    }

}
