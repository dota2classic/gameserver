import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatedAt1768755068993 implements MigrationInterface {
    name = 'CreatedAt1768755068993'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "match_entity" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "match_entity" DROP COLUMN "created_at"`);
    }

}
