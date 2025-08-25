import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
  Relation,
} from 'typeorm';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { DotaPatch } from 'gateway/constants/patch';
import { Region } from 'gateway/shared-types/region';

@Entity("finished_match")
export default class FinishedMatchEntity {
  @Column("smallint")
  winner!: number;

  @PrimaryColumn()
  id!: number;

  @Column("smallint")
  game_mode: Dota_GameMode;

  @CreateDateColumn()
  @Index("match_timestamp_index")
  timestamp!: string;

  @Column("smallint")
  @Index("finished_match_matchmaking_mode_index")
  matchmaking_mode: MatchmakingMode;
  // On which server match was played
  @Column({ nullable: true })
  server: string;

  @Column("int", { default: 0 })
  duration!: number;

  @Column("int", { nullable: true })
  externalMatchId?: number;

  @OneToMany((type) => PlayerInMatchEntity, (pim) => pim.match, { eager: true })
  players!: Relation<PlayerInMatchEntity>[];

  @ManyToOne(() => GameSeasonEntity, (t) => t.players)
  @JoinColumn({
    referencedColumnName: "id",
    name: "season_id",
  })
  season: GameSeasonEntity;

  @Column({
    name: "patch",
    default: DotaPatch.DOTA_684,
    enum: DotaPatch,
    type: "enum",
  })
  public patch: DotaPatch;

  @Column({
    name: "region",
    default: Region.RU_MOSCOW,
    enum: Region,
    type: "enum",
  })
  public region: Region;

  @Column({ name: "season_id", default: 1 })
  seasonId: number;

  constructor(
    id: number | undefined,
    winner: number,
    timestamp: string,
    game_mode: Dota_GameMode,
    matchmaking_mode: MatchmakingMode,
    duration: number,
    server: string,
    seasonId: number,
    patch: DotaPatch,
    region: Region,
  ) {
    this.id = id;
    this.winner = winner;
    this.timestamp = timestamp;
    this.game_mode = game_mode;
    this.matchmaking_mode = matchmaking_mode;
    this.duration = duration;
    this.server = server;
    this.seasonId = seasonId;
    this.patch = patch;
    this.region = region;
  }
}
