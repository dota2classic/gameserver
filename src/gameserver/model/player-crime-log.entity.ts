import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { BanReason } from 'gateway/shared-types/ban';

@Entity()
export class PlayerCrimeLogEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  steam_id: string;

  @Column()
  crime: BanReason;

  @Column({ default: false })
  handled: boolean;

  @Column({ default: 0 })
  banTime: number;

  @CreateDateColumn({ type: "timestamptz" })
  created_at: Date;
}
