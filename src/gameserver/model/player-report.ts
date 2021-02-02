import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class PlayerReport {

  @PrimaryColumn()
  steam_id: string;


  @Column({ default: 1 })
  reports: number
}
