import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';

@Entity()
export class ReplayEntity {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  matchId: number;


  @Column()
  timestamp: number;

  @Column("simple-json")
  content: LiveMatchUpdateEvent
}
