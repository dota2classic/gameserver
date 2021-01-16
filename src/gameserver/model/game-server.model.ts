import { AggregateRoot } from '@nestjs/cqrs';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchInfo } from 'gateway/events/room-ready.event';
import { Entity, PrimaryColumn } from 'typeorm';


@Entity()
export class GameServerModel {


  @PrimaryColumn()
  public url: string;


  public version: Dota2Version

}
