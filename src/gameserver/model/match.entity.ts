import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GSMatchInfo } from 'gateway/commands/LaunchGameServer/launch-game-server.command';

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


  @Column({ type: "simple-json", nullable: true, default: null })
  matchInfoJson: GSMatchInfo;


  static NOT_DECIDED_SERVER: string = "NOT_DECIDED_SERVER";
}
