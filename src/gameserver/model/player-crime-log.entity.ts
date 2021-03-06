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

  @Column({ default: true })
  handled: boolean

  @CreateDateColumn()
  created_at: Date;

}
