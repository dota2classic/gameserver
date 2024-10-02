import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MmrChangeLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  playerId: string;

  @Column({ default: -1 })
  matchId: number;

  @Column()
  winner: boolean;

  @Column({ type: "float"})
  winnerAverage: number;

  @Column({ type: "float"})
  loserAverage: number;

  @Column({ type: "float"})
  mmrBefore: number;

  @Column({ type: "float"})
  mmrAfter: number;

  @Column({ default: false })
  hiddenMmr: boolean


  @Column({ type: "float"})
  change: number
}
