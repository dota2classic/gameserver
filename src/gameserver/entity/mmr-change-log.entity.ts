import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MmrChangeLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  playerId: string;

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


  @Column({ type: "float"})
  change: number
}
