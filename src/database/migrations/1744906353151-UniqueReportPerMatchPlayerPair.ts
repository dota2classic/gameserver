import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueReportPerMatchPlayerPair1744906353151 implements MigrationInterface {
    name = 'UniqueReportPerMatchPlayerPair1744906353151'

    public async up(queryRunner: QueryRunner): Promise<void> {

        // Remove duplicates
        await queryRunner.query(`
DELETE FROM
 player_report
WHERE id IN
    (WITH cte AS
       (SELECT *,
               row_number() over(PARTITION BY reporter_steam_id, reported_steam_id, match_id
                                 ORDER BY id ASC) AS rn
        FROM player_report) SELECT id
     FROM cte
     WHERE rn > 1)
     `)
        await queryRunner.query(`CREATE UNIQUE INDEX "PlayerReport_only_one_report_per_match_for_player_pair" ON "player_report" ("reporter_steam_id", "reported_steam_id", "match_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."PlayerReport_only_one_report_per_match_for_player_pair"`);
    }

}
