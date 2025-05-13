import { MigrationInterface, QueryRunner } from 'typeorm';

export class DodgeList1747139753955 implements MigrationInterface {
    name = 'DodgeList1747139753955'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "dodge_list_entry" ("steam_id" character varying NOT NULL, "dodged_steam_id" character varying NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_9789fc55f3c47b5866813643b55" PRIMARY KEY ("steam_id", "dodged_steam_id"))`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "dodge_list_entry"`);
    }

}
