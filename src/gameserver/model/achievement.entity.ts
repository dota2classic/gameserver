import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { VirtualColumn2 } from 'virtual-column';

@Entity('achievement_entity')
export class AchievementEntity {
  @PrimaryColumn({ name: 'steam_id' })
  steam_id: string;

  @PrimaryColumn({ name: 'achievement_key', type: 'smallint' })
  achievement_key: AchievementKey;

  @Column({ default: 0 })
  progress: number;

  @ManyToOne(type => FinishedMatchEntity)
  @JoinColumn({
    foreignKeyConstraintName: 'FK_match_achievement',
    name: 'matchId',
  })
  match?: Relation<FinishedMatchEntity>;

  @ManyToOne(type => PlayerInMatchEntity)
  @JoinColumn([
    {
      name: 'matchId',
      referencedColumnName: 'matchId',
    },
    {
      name: 'steam_id',
      referencedColumnName: 'playerId',
    },
  ])
  pim?: Relation<PlayerInMatchEntity>;

  @Column({ nullable: true, default: null })
  matchId?: number;

  @Column({ nullable: true, default: null })
  hero?: string;

  @VirtualColumn2("percentile", (t) => Number(t))
  percentile: number;
}
