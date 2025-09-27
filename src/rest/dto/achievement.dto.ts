import { ApiProperty } from '@nestjs/swagger';
import { MatchDto } from 'rest/dto/match.dto';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';

export class AchievementDto {
  @ApiProperty({ enum: AchievementKey, enumName: 'AchievementKey' })
  key: AchievementKey;

  steamId: string;
  progress: number;
  checkpoints: number[];
  isComplete: boolean;
  match?: MatchDto;
}
