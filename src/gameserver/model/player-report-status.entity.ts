import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('player_report_status')
export class PlayerReportStatusEntity {

  @PrimaryColumn({
    unique: true
  })
  steam_id: string;

  @Column({ nullable: true, default: null})
  updated_with_match_id: number

  @Column({ default: 1 })
  reports: number
}
