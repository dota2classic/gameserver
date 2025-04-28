import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeColName1745856166105 implements MigrationInterface {
    name = 'ChangeColName1745856166105'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_ban" RENAME COLUMN "endTime" TO "end_time"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_ban" RENAME COLUMN "end_time" TO "endTime"`);
    }

}
