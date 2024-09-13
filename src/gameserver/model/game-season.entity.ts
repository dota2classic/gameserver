import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';


@Entity('game_season')
export class GameSeasonEntity {
  @PrimaryColumn()
  public id: number;

  @PrimaryColumn()
  public version: Dota2Version;

  @Column()
  start_timestamp!: Date;
}
