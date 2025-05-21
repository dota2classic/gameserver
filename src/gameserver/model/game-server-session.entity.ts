import { Column, Entity, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import { Dota_Map } from 'gateway/shared-types/dota-map';
import { MatchSummary } from 'gateway/shared-types/match-summary';

@Entity("game_server_session")
export class GameServerSessionEntity {
  @PrimaryColumn({ name: "match_id" })
  matchId: number;

  @Column({ name: "server_url" })
  url: string;

  @Column({ name: "room_id" })
  roomId: string;

  @Column({ name: "matchmaking_mode" })
  matchmaking_mode: MatchmakingMode;

  @Column({ name: "game_mode" })
  gameMode: Dota_GameMode;

  @Column({ name: "map" })
  map: Dota_Map;

  @Column({ name: "game_state" })
  gameState: Dota_GameRulesState;

  @Column({ name: "duration", default: 0 })
  duration: number;

  @Column({ type: "timestamptz", default: () => "now()" })
  timestamp: Date;

  @OneToMany(() => GameSessionPlayerEntity, (t) => t.session, { eager: true })
  players: Relation<GameSessionPlayerEntity>[];

  constructor(
    matchId: number,
    url: string,
    roomId: string,
    matchmaking_mode: MatchmakingMode,
    gameMode: Dota_GameMode,
    map: Dota_Map,
    gameState: Dota_GameRulesState,
    duration: number,
  ) {
    this.matchId = matchId;
    this.url = url;
    this.roomId = roomId;
    this.matchmaking_mode = matchmaking_mode;
    this.gameMode = gameMode;
    this.map = map;
    this.gameState = gameState;
    this.duration = duration;
  }

  public asSummary(): MatchSummary {
    return {
      matchId: this.matchId,
      lobbyType: this.matchmaking_mode,
      map: this.map,
      gameMode: this.gameMode,
      roomId: this.roomId,
      players: this.players.map((plr) => ({
        steamId: plr.steamId,
        partyId: plr.partyId,
        team: plr.team,
      })),
    };
  }
}
