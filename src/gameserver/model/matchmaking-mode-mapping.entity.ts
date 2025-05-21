import { Column, Entity, PrimaryColumn } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { Dota_Map } from 'gateway/shared-types/dota-map';

@Entity("matchmaking_mode_mapping_entity")
export class MatchmakingModeMappingEntity {
  @PrimaryColumn({ name: "lobby_type" })
  public lobbyType: MatchmakingMode;

  @Column({ name: "enabled" })
  public enabled: boolean;

  @Column({ name: "dota_game_mode" })
  public dotaGameMode: Dota_GameMode;

  @Column({ name: "dota_map", default: Dota_Map.DOTA })
  public dotaMap: Dota_Map;

  @Column({ name: "fill_bots", default: false })
  public fillBots: boolean;

  @Column({ name: "enable_cheats", default: false })
  public enableCheats: boolean;
}
