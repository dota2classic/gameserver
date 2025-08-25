import { MigrationInterface, QueryRunner } from 'typeorm';

export class MatchRegion1756137342648 implements MigrationInterface {
    name = 'MatchRegion1756137342648'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."finished_match_patch_enum" AS ENUM('DOTA_684', 'DOTA_684_TURBO')`);
        await queryRunner.query(`ALTER TABLE "finished_match" ADD "patch" "public"."finished_match_patch_enum" NOT NULL DEFAULT 'DOTA_684'`);
        await queryRunner.query(`CREATE TYPE "public"."finished_match_region_enum" AS ENUM('DOTA_684', 'DOTA_684_TURBO')`);
        await queryRunner.query(`ALTER TABLE "finished_match" ADD "region" "public"."finished_match_region_enum" NOT NULL DEFAULT 'ru_moscow'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finished_match" DROP COLUMN "region"`);
        await queryRunner.query(`DROP TYPE "public"."finished_match_region_enum"`);
        await queryRunner.query(`ALTER TABLE "finished_match" DROP COLUMN "patch"`);
        await queryRunner.query(`DROP TYPE "public"."finished_match_patch_enum"`);
    }

}
