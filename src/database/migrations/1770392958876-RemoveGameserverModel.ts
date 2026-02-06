import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveGameserverModel1770392958876 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "game_server_model"`);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
