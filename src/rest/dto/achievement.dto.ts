import { AchievementKey } from 'gameserver/achievements/base.achievement';
import { ApiProperty } from '@nestjs/swagger';
import { MatchDto } from 'rest/dto/match.dto';

export class AchievementDto {
  @ApiProperty({ enum: AchievementKey, enumName: 'AchievementKey' })
  key: AchievementKey;

  steamId: string;
  maxProgress: number;
  progress: number;
  isComplete: boolean;
  match?: MatchDto;
}
