import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class GameServerModel {
  @PrimaryColumn()
  public url: string;

  @Column({ default: Dota2Version.Dota_681 })
  public version: Dota2Version;
}
