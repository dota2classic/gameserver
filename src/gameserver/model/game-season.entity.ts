import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';

@Entity("game_season")
export class GameSeasonEntity {
  @PrimaryColumn()
  public id: number;

  @Column({ type: "timestamptz", name: "start_timestamp"})
  startTimestamp!: Date;

  @OneToMany(() => VersionPlayerEntity, (t) => t.season)
  players: Relation<VersionPlayerEntity>[];
}
