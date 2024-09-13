import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('player_report_status')
export class PlayerReportStatusEntity {

  @PrimaryColumn()
  steam_id: string;


  @Column({ nullable: true, default: null})
  updatedWithMatch: number

  @Column({ default: 1 })
  reports: number
}
