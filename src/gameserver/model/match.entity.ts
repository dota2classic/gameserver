import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Entity()
export class MatchEntity {

  @PrimaryGeneratedColumn()
  id!: number;


  @Column()
  started: boolean;

  @Column()
  server: string

  @Column()
  mode: MatchmakingMode
}