import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class PlayerReportStatus {

  @PrimaryColumn()
  steam_id: string;


  @Column({ nullable: true, default: null})
  updatedWithMatch: number

  @Column({ default: 1 })
  reports: number
}
