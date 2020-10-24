import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@Entity()
export class VersionPlayer {
  @PrimaryColumn()
  steam_id: string;

  @PrimaryColumn()
  version: Dota2Version;

  @Column()
  mmr: number = 3000;
}
