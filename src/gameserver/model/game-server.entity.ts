import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('game_server_model')
export class GameServerEntity {
  @PrimaryColumn()
  public url: string;

  @Column({ default: Dota2Version.Dota_681 })
  public version: Dota2Version;
}
