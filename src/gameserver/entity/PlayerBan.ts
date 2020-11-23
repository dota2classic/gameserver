import { Column, Entity, PrimaryColumn } from 'typeorm';
import { BanReason } from 'gateway/shared-types/ban';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';

@Entity()
export class PlayerBan {
  @PrimaryColumn()
  steam_id: string;

  @Column()
  endTime: Date;

  @Column()
  reason: BanReason;




  public asBanStatus(): BanStatus{
    return new BanStatus(new Date().getTime() < this.endTime.getTime(), this.endTime.getTime(), this.reason)
  }
}
