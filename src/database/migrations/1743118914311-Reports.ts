import { MigrationInterface, QueryRunner } from 'typeorm';

export class Reports1743118914311 implements MigrationInterface {
    name = 'Reports1743118914311'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report_status" RENAME COLUMN "updatedWithMatch" TO "updated_with_match_id"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "created_at"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "reporter"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "reported"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "text"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "matchId"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "chosen_aspect" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "reporter_steam_id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_b6b89a00ce08b7bac8b9e38d6eb"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_3d70a0d6e8c6354669cf0b728e8" PRIMARY KEY ("id", "reporter_steam_id")`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "reported_steam_id" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_3d70a0d6e8c6354669cf0b728e8"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_630a1f83d059d6f3e8f01893cbf" PRIMARY KEY ("id", "reporter_steam_id", "reported_steam_id")`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "match_id" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_630a1f83d059d6f3e8f01893cbf"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_92b1702111ffd80375697b24934" PRIMARY KEY ("id", "reporter_steam_id", "reported_steam_id", "match_id")`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "commentary" character varying NOT NULL DEFAULT ''`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "commentary"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_92b1702111ffd80375697b24934"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_630a1f83d059d6f3e8f01893cbf" PRIMARY KEY ("id", "reporter_steam_id", "reported_steam_id")`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "match_id"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_630a1f83d059d6f3e8f01893cbf"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_3d70a0d6e8c6354669cf0b728e8" PRIMARY KEY ("id", "reporter_steam_id")`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "reported_steam_id"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP CONSTRAINT "PK_3d70a0d6e8c6354669cf0b728e8"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD CONSTRAINT "PK_b6b89a00ce08b7bac8b9e38d6eb" PRIMARY KEY ("id")`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "reporter_steam_id"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "chosen_aspect"`);
        await queryRunner.query(`ALTER TABLE "player_report" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "matchId" integer NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "text" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "reported" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "reporter" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_report" ADD "created_at" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player_report_status" RENAME COLUMN "updated_with_match_id" TO "updatedWithMatch"`);
    }

}
