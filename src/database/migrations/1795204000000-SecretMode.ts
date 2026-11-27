import { MigrationInterface, QueryRunner } from 'typeorm';

export class SecretMode1795204000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      INSERT INTO matchmaking_mode_mapping_entity
        (lobby_type, enabled, dota_game_mode, dota_map, fill_bots, patch, enable_cheats)
      VALUES (14, true, 1, 'dota', false, 'DOTA_684', false)
      ON CONFLICT (lobby_type) DO NOTHING
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM matchmaking_mode_mapping_entity WHERE lobby_type = 14`);
  }
}
