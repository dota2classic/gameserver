import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';

@Entity("version_player")
export class VersionPlayerEntity {
  @PrimaryColumn({ name: "steam_id" })
  steamId: string;

  @Column({ default: VersionPlayerEntity.STARTING_MMR, name: "mmr" })
  mmr: number = VersionPlayerEntity.STARTING_MMR;

  @ManyToOne(() => GameSeasonEntity, (t) => t.players)
  @JoinColumn({
    referencedColumnName: "id",
    name: "season_id",
  })
  season: GameSeasonEntity;

  @PrimaryColumn({ name: "season_id", default: 1 })
  seasonId: number;

  public static STARTING_MMR = 1000;


  constructor(steamId: string, mmr: number, seasonId: number) {
    this.steamId = steamId;
    this.mmr = mmr;
    this.seasonId = seasonId;
  }
}
