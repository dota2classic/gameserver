import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class PlayerReport {

  @PrimaryGeneratedColumn()
  id: number;


  @CreateDateColumn()
  created_at: Date;

  @Column()
  reporter: string;

  @Column()
  reported: string;

  @Column()
  text: string;

  @Column()
  matchId: number;
}
