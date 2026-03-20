import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity('player_education_lock')
export class PlayerEducationLockEntity {
  @PrimaryColumn({ name: 'steam_id' })
  steamId: string;

  @Column({ name: 'required_games', default: 1 })
  requiredGames: number;

  @Column({ default: false })
  resolved: boolean;

  @Column({ name: 'total_bot_games', default: 0 })
  totalBotGames: number;

  @Column({ name: 'recent_kda', type: 'float', default: 0 })
  recentKda: number;

  @Column({ name: 'recent_winrate', type: 'float', default: 0 })
  recentWinrate: number;
}