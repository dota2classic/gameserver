import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Entity()
export default class FinishedMatch {


  @Column('smallint')
  winner!: number;

  @PrimaryColumn()
  id!: number;

  @Column('smallint')
  game_mode: Dota_GameMode;

  @CreateDateColumn()
  timestamp!: string;
  @Column('smallint')
  matchmaking_mode: MatchmakingMode
  // On which server match was played
  @Column({ nullable: true })
  server: string;

  @Column('int', { default: 0 })
  duration!: number;

  @Column('int', { nullable: true })
  externalMatchId?: number;

  @OneToMany(
    type => PlayerInMatch,
    pim => pim.match,
    { eager: true },
  )
  players!: PlayerInMatch[];

  constructor(id: number | undefined, winner: number, timestamp: string, game_mode: Dota_GameMode, matchmaking_mode: MatchmakingMode, duration: number, server: string) {
    this.id = id;
    this.winner = winner;
    this.timestamp = timestamp;
    this.game_mode = game_mode;
    this.matchmaking_mode = matchmaking_mode;
    this.duration = duration;
    this.server = server;
  }
}
