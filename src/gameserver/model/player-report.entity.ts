import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';

@Entity("player_report")
@Index(
  "PlayerReport_only_one_report_per_match_for_player_pair",
  ["reporterSteamId", "reportedSteamId", "matchId"],
  { unique: true },
)
export class PlayerReportEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @CreateDateColumn({
    name: "created_at"
  })
  createdAt: Date;

  @Column({
    name: "chosen_aspect",
    enumName: "player_aspect",
    enum: PlayerAspect,
  })
  aspect: PlayerAspect;

  @Column({ name: "reporter_steam_id" })
  reporterSteamId: string;

  @Column({ name: "reported_steam_id" })
  reportedSteamId: string;

  @Column({ name: "match_id" })
  matchId: number;
}
