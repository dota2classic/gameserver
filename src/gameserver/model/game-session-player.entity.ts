import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { DotaConnectionState } from 'gateway/shared-types/dota-player-connection-state';
import { DotaTeam } from 'gateway/shared-types/dota-team';

@Entity("game_server_session_player")
export class GameSessionPlayerEntity {
  @PrimaryColumn({ name: "steam_id" })
  steamId: string;

  @PrimaryColumn({ name: "match_id" })
  matchId: number;

  @ManyToOne(() => GameServerSessionEntity, (t) => t.players)
  @JoinColumn({
    referencedColumnName: "matchId",
    name: "match_id",
  })
  session: GameServerSessionEntity;

  @Column({ name: "party_id" })
  partyId: string;

  @Column({ name: "team" })
  team: DotaTeam;

  @Column({ name: "connection_state" })
  connection: DotaConnectionState;

  @Column({ name: "abandoned", default: false })
  abandoned: boolean;

  constructor(steamId: string, matchId: number, partyId: string, team: DotaTeam, connection: DotaConnectionState, abandoned: boolean = false) {
    this.steamId = steamId;
    this.matchId = matchId;
    this.partyId = partyId;
    this.team = team;
    this.connection = connection;
    this.abandoned = abandoned;
  }

}
