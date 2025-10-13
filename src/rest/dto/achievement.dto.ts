import { ApiProperty } from '@nestjs/swagger';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';

export class AchievementDto {
  @ApiProperty({ enum: AchievementKey, enumName: 'AchievementKey' })
  key: AchievementKey;

  steamId: string;
  progress: number;
  percentile: number;
  checkpoints: number[];
  isComplete: boolean;
  matchId?: number;
}



export class DBAchievementDto {
  steam_id: string;
  achievement_key: AchievementKey;
  progress: number;

  matchId?: number;
  hero?: string;

  percentile: number;
}
