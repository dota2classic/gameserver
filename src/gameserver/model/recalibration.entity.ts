import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Relation,
  Unique,
} from 'typeorm';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';

@Entity("recalibration")
@Unique("one_recalibration_per_season", ['steamId', 'seasonId'])
export class RecalibrationEntity {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({
    name: "steam_id",
  })
  steamId: string;

  @ManyToOne(() => GameSeasonEntity, (t) => t.recalibrations)
  @JoinColumn({
    referencedColumnName: 'id',
    name: 'season_id'
  })
  season: Relation<GameSeasonEntity>;

  @Column({
    name: "season_id",
  })
  seasonId: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamptz"
  })
  createdAt: Date;
}
