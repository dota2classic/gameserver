import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueVersionPlayer1761166821143 implements MigrationInterface {
    name = 'UniqueVersionPlayer1761166821143'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE UNIQUE INDEX "version_player_unique_per_season" ON "version_player" ("steam_id", "season_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."version_player_unique_per_season"`);
    }

}
