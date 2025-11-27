import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReplayPath1764280057634 implements MigrationInterface {
    name = 'ReplayPath1764280057634'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finished_match" ADD "replay_path" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "finished_match" DROP COLUMN "replay_path"`);
    }

}
