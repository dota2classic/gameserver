import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BanReason } from 'gateway/shared-types/ban';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Entity()
export class PlayerCrimeLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  steam_id: string;

  @Column()
  crime: BanReason;

  @Column({ default: null, nullable: true })
  lobby_type?: MatchmakingMode;

  @Column({ default: false })
  handled: boolean;

  @Column({ default: 0 })
  banTime: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;

  constructor(steam_id: string, crime: BanReason | undefined, lobby_type: MatchmakingMode) {
    this.steam_id = steam_id;
    this.crime = crime;
    this.lobby_type = lobby_type;
  }
}
