import { MigrationInterface, QueryRunner } from "typeorm";

export class EducationLock1774003918564 implements MigrationInterface {
  name = "EducationLock1774003918564";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "player_education_lock" ("steam_id" character varying NOT NULL, "required_games" integer NOT NULL DEFAULT '1', "resolved" boolean NOT NULL DEFAULT false, "total_bot_games" integer NOT NULL DEFAULT '0', "recent_kda" double precision NOT NULL DEFAULT '0', "recent_winrate" double precision NOT NULL DEFAULT '0', CONSTRAINT "PK_9b650ed5cb5d958090ea5690aff" PRIMARY KEY ("steam_id"))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "player_education_lock"`);
  }
}
