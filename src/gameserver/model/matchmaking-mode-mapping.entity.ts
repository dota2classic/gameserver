import { Column, Entity, PrimaryColumn } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';

@Entity('matchmaking_mode_mapping_entity')
export class MatchmakingModeMappingEntity {

  @PrimaryColumn({ name: "lobby_type" })
  public lobbyType: MatchmakingMode


  @Column({ name: "enabled"})
  public enabled: boolean;

  @Column({ name: "dota_game_mode" })
  public dotaGameMode: Dota_GameMode
}