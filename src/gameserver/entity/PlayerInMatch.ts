import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import Match from './Match';

@Entity()
export default class PlayerInMatch {
  @PrimaryGeneratedColumn()
  id!: number;

  /**
   * PlayerId
   */
  @Column()
  playerId!: string;

  @ManyToOne(
    type => Match,
    match => match.players,
  )
  match!: Match;

  @Column('int')
  team!: number;

  @Column('int')
  kills!: number;

  @Column('int')
  deaths!: number;

  @Column('int')
  assists!: number;

  @Column('int')
  level!: number;

  @Column('varchar')
  items!: string;

  @Column('int', { default: 0 })
  gpm: number = 0;

  @Column('int', { default: 0 })
  xpm: number = 0;

  @Column({ default: false })
  abandoned: boolean;

  @Column('int', { default: 0 })
  last_hits: number = 0;

  @Column('int', { default: 0 })
  denies: number = 0;

  @Column('varchar')
  hero!: string;
}

/**
 1,npc_dota_hero_antimage,2,12,13,5,4,3
 2,npc_dota_hero_axe,2,13,13,5,4,3
 3,npc_dota_hero_bane,2,14,13,5,4,6
 4,npc_dota_hero_bloodseeker,2,15,13,9,4,3
 5,npc_dota_hero_crystal_maiden,2,16,13,5,2,3
 6,npc_dota_hero_drow_ranger,3,17,13,5,4,7
 7,npc_dota_hero_earthshaker,3,18,13,5,4,3
 8,npc_dota_hero_juggernaut,3,19,13,12,4,3
 9,npc_dota_hero_mirana,3,20,13,5,4,8
 10,npc_dota_hero_nevermore,3,21,13,5,4,3
*/

/*

13,2020-07-02 23:06:23.806775,0,true


1,3000,Itachi
2,3500,Ancient4
3,3200,Papich
4,3200,wicked
5,3200,stas
6,3200,lenny
7,3200,limer
8,3200,ghoul
9,3200,maloy
10,3200,oxxy

 */
