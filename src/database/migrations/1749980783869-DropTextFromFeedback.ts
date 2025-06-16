import { MigrationInterface, QueryRunner } from 'typeorm';

export class DropTextFromFeedback1749980783869 implements MigrationInterface {
    name = 'DropTextFromFeedback1749980783869'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report" RENAME COLUMN "createdAt" TO "created_at" `);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "commentary"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report" ADD "commentary" character varying NOT NULL DEFAULT ''`);
        await queryRunner.query(`ALTER TABLE "player_report" RENAME COLUMN "created_at" TO "createdAt" `);
    }

}
