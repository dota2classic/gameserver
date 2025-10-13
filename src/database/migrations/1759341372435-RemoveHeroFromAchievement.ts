import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveHeroFromAchievement1759341372435 implements MigrationInterface {
    name = 'RemoveHeroFromAchievement1759341372435'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "achievement_entity" DROP COLUMN "hero"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "achievement_entity" ADD "hero" character varying`);
    }

}
