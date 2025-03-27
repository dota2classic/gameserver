import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
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

  @Column({ name: "reporter_steam_id" })
  reporterSteamId: string;

  @Column({ name: "reported_steam_id" })
  reportedSteamId: string;

  @Column({ name: "commentary", default: "" })
  commentary: string;

  @Column({ name: "match_id" })
  matchId: number;
}
