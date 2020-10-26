import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany, PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

enum MatchType {
  RANKED,
  UNRANKED,
}

@Entity()
export default class Match {
  @PrimaryColumn()
  id!: number;

  @Column('boolean')
  radiant_win!: boolean;

  @CreateDateColumn()
  timestamp!: string;

  @Column('int')
  type!: MatchmakingMode;

  @Column('int', { default: 0 })
  duration!: number;

  @OneToMany(
    type => PlayerInMatch,
    pim => pim.match,
    { eager: true },
  )
  players!: PlayerInMatch[];

  @Column({ nullable: true })
  server: string;

}
