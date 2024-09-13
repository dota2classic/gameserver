import { Column, Entity, PrimaryColumn } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@Entity('version_player')
export class VersionPlayerEntity {
  @PrimaryColumn()
  steam_id: string;

  @PrimaryColumn()
  version: Dota2Version;

  @Column({ default: VersionPlayerEntity.STARTING_MMR})
  mmr: number = VersionPlayerEntity.STARTING_MMR;


  public static STARTING_MMR = 2500;
}
