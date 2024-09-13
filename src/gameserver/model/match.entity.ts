import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Entity('match_entity')
export class MatchEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ default: false})
  started: boolean;

  @Column({ default: true })
  finished: boolean;

  @Column()
  server: string;

  @Column()
  mode: MatchmakingMode;



  static NOT_DECIDED_SERVER: string = "NOT_DECIDED_SERVER";
}
