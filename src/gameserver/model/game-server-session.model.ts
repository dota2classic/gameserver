import { AggregateRoot } from '@nestjs/cqrs';
import { MatchInfo } from 'gateway/events/room-ready.event';
import { Column, Entity, PrimaryColumn } from 'typeorm';


@Entity()
export class GameServerSessionModel {

  @PrimaryColumn()
  public url: string;

  @Column()
  matchId: number;


  @Column("simple-json")
  matchInfoJson: MatchInfo;




}
