import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';


@Entity()
export class GameSeason {
  @PrimaryColumn()
  public id: number;

  @PrimaryColumn()
  public version: Dota2Version;

  @Column()
  start_timestamp!: Date;
}
