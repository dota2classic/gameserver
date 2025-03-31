import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReportsPrimaryKey1743404261980 implements MigrationInterface {
    name = 'ReportsPrimaryKey1743404261980'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."player_report_primary"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "id" SERIAL NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_fbebdf80916d43fede19bb92ed8"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_b6b89a00ce08b7bac8b9e38d6eb" PRIMARY KEY ("id")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_b6b89a00ce08b7bac8b9e38d6eb"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_fbebdf80916d43fede19bb92ed8" PRIMARY KEY ("reporter_steam_id", "reported_steam_id", "match_id")`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "id"`);
        await queryRunner.query(`CREATE UNIQUE INDEX "player_report_primary" ON "player_report" ("reporter_steam_id", "reported_steam_id", "match_id") `);
    }

}
