import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserAbandonedSession1751438926167 implements MigrationInterface {
    name = 'UserAbandonedSession1751438926167'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_server_session_player" ADD "user_abandoned" boolean NOT NULL DEFAULT false`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game_server_session_player" DROP COLUMN "user_abandoned"`);
    }

}
