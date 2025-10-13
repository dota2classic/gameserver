import { MigrationInterface, QueryRunner } from 'typeorm';

export class RegionAndPatchInMatch1756143699652 implements MigrationInterface {
    name = 'RegionAndPatchInMatch1756143699652'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."finished_match_patch_enum" AS ENUM('DOTA_684', 'DOTA_684_TURBO')`);
        await queryRunner.query(`ALTER TABLE "finished_match" ADD "patch" "public"."finished_match_patch_enum" NOT NULL DEFAULT 'DOTA_684'`);
        await queryRunner.query(`CREATE TYPE "public"."finished_match_region_enum" AS ENUM('ru_moscow', 'ru_novosibirsk', 'eu_czech')`);
        await queryRunner.query(`ALTER TABLE "finished_match" ADD "region" "public"."finished_match_region_enum" NOT NULL DEFAULT 'ru_moscow'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finished_match" DROP COLUMN "region"`);
        await queryRunner.query(`DROP TYPE "public"."finished_match_region_enum"`);
        await queryRunner.query(`ALTER TABLE "finished_match" DROP COLUMN "patch"`);
        await queryRunner.query(`DROP TYPE "public"."finished_match_patch_enum"`);
    }

}
