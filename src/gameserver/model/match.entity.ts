import { Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class MatchEntity {

  @PrimaryGeneratedColumn()
  id!: number;

}