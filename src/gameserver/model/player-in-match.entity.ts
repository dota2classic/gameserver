import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, PrimaryColumn, Relation } from 'typeorm';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';

@Entity('player_in_match')
@Index('player_match_index', ['matchId'])
export default class PlayerInMatchEntity {
  /**
   * PlayerId
   */
  @PrimaryColumn({
    name: 'playerId',
    primaryKeyConstraintName: 'PK_pim_player_match_idx',
    primary: true
  })
  playerId!: string;

  @PrimaryColumn({
    name: 'matchId',
    primaryKeyConstraintName: 'PK_pim_player_match_idx',
    primary: true
  })
  matchId: number;

  @ManyToOne(
    type => FinishedMatchEntity,
    match => match.players,
  )
  @JoinColumn({
    foreignKeyConstraintName: 'FK_match_player',
    name: 'matchId',
  })
  match!: Relation<FinishedMatchEntity>;

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

  @Column('int', { default: 0 })
  gpm: number = 0;

  @Column('int', { default: 0 })
  xpm: number = 0;

  @Column('int', { default: 0 })
  hero_damage: number = 0;

  @Column('int', { default: 0 })
  tower_damage: number = 0;

  @Column('int', { default: 0 })
  hero_healing: number = 0;

  @Column({ default: false })
  abandoned: boolean;

  @Column('int', { default: 0 })
  last_hits: number = 0;

  @Column('int', { default: 0 })
  denies: number = 0;

  @Column('int', { default: 0 })
  gold: number = 0;

  @Column('varchar')
  hero!: string;

  @Column('smallint', { default: 0 })
  item0: number;

  @Column('smallint', { default: 0 })
  item1: number;

  @Column('smallint', { default: 0 })
  item2: number;

  @Column('smallint', { default: 0 })
  item3: number;

  @Column('smallint', { default: 0 })
  item4: number;

  @Column('smallint', { default: 0 })
  item5: number;

  @OneToMany(type => MmrChangeLogEntity, t => t.pim, { eager: true })
  mmrChange: MmrChangeLogEntity[]

  @Column('uuid', { nullable: true, default: null})
  party_id?: string;

  // constructor(playerId: string, team: number, kills: number, deaths: number, assists: number, level: number, gpm: number, xpm: number, abandoned: boolean, last_hits: number, denies: number, hero: string, items: string, item0: number, item1: number, item2: number, item3: number, item4: number, item5: number) {
  //   this.playerId = playerId;
  //   this.team = team;
  //   this.kills = kills;
  //   this.deaths = deaths;
  //   this.assists = assists;
  //   this.level = level;
  //   this.gpm = gpm;
  //   this.xpm = xpm;
  //   this.abandoned = abandoned;
  //   this.last_hits = last_hits;
  //   this.denies = denies;
  //   this.hero = hero;
  //   this.items = items;
  //   this.item0 = item0;
  //   this.item1 = item1;
  //   this.item2 = item2;
  //   this.item3 = item3;
  //   this.item4 = item4;
  //   this.item5 = item5;
  // }
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
