import { Column, Entity, PrimaryColumn } from 'typeorm';
import { AchievementKey } from 'gameserver/achievements/base.achievement';

@Entity('achievement_entity')
export class AchievementEntity {
  @PrimaryColumn({ name: 'steam_id' })
  steam_id: string;

  @PrimaryColumn({ name: 'achievement_key', type: "smallint" })
  achievement_key: AchievementKey;

  @Column({ default: 0 })
  progress: number;

  @Column({ nullable: true, default: null })
  matchId?: number;

  @Column({ nullable: true, default: null })
  hero?: string;
}
