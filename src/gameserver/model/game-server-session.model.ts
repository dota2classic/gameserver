import { Column, Entity, PrimaryColumn } from 'typeorm';
import { GSMatchInfo } from 'gateway/commands/LaunchGameServer/launch-game-server.command';


@Entity()
export class GameServerSessionModel {

  @PrimaryColumn()
  public url: string;

  @Column()
  matchId: number;


  @Column("simple-json")
  matchInfoJson: GSMatchInfo;




}
