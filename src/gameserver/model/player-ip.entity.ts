import { Column, Entity, PrimaryColumn } from 'typeorm';

export enum InteractionType {
  MATCH_CONNECT = 'MATCH_CONNECT'
}

@Entity()
export class PlayerIpEntity {
  @PrimaryColumn({ name: "steam_id" })
  steamId: string;

  @PrimaryColumn({ name: "ip" })
  ip: string;

  @Column({ name: 'interaction_type' })
  interactionType: InteractionType


  constructor(steamId: string, ip: string, interactionType: InteractionType) {
    this.steamId = steamId;
    this.ip = ip;
    this.interactionType = interactionType;
  }
}
