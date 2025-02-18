import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

@Entity()
export class MmrChangeLogEntity {
  @PrimaryColumn()
  playerId: string;

  @PrimaryColumn()
  matchId: number;

  @Column()
  winner: boolean;

  @Column({ type: "float" })
  winnerAverage: number;

  @Column({ type: "float" })
  loserAverage: number;

  @Column({ type: "float" })
  mmrBefore: number;

  @Column({ type: "float" })
  mmrAfter: number;

  @Column({ default: false })
  hiddenMmr: boolean;

  @Column({ type: "float" })
  change: number;

  @Column({ type: "float", default: 1.0, name: "player_performance_coefficient" })
  playerPerformanceCoefficient: number;

  @ManyToOne((type) => PlayerInMatchEntity)
  @JoinColumn([
    {
      name: "matchId",
      referencedColumnName: "matchId",
    },
    {
      name: "playerId",
      referencedColumnName: "playerId",
    },
  ])
  pim?: Relation<PlayerInMatchEntity>;
}
