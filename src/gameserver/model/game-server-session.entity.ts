import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GSMatchInfo } from 'gateway/commands/LaunchGameServer/launch-game-server.command';


@Entity('game_server_session_model')
export class GameServerSessionEntity {

  @PrimaryColumn()
  public url: string;

  @Column()
  matchId: number;


  @Column("simple-json")
  matchInfoJson: GSMatchInfo;




}
