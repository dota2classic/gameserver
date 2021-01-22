import { Column, Entity, PrimaryColumn, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MmrChangeLogEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  playerId: string;

  @Column()
  winner: boolean;

  @Column()
  winnerAverage: number;

  @Column()
  loserAverage: number;

  @Column()
  change: number
}
