import { Column, CreateDateColumn, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';

@Entity("player_report")
export class PlayerReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn()
  createdAt: Date;

  @Column({
    name: "chosen_aspect",
    enumName: "player_aspect",
    enum: PlayerAspect,
  })
  aspect: PlayerAspect;

  @PrimaryColumn({ name: "reporter_steam_id" })
  reporterSteamId: string;

  @PrimaryColumn({ name: "reported_steam_id" })
  reportedSteamId: string;

  @PrimaryColumn({ name: "match_id" })
  matchId: number;

  @Column({ name: "commentary", default: "" })
  commentary: string;
}
