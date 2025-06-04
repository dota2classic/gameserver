import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { RecalibrationEntity } from 'gameserver/model/recalibration.entity';

@Entity("game_season")
export class GameSeasonEntity {
  @PrimaryColumn()
  public id: number;

  @Column({ type: "timestamptz", name: "start_timestamp"})
  startTimestamp!: Date;

  @OneToMany(() => VersionPlayerEntity, (t) => t.season)
  players: Relation<VersionPlayerEntity>[];


  @OneToMany(() => RecalibrationEntity, (t) => t.season)
  recalibrations: Relation<RecalibrationEntity>[];



}
