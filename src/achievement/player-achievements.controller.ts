import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { AchievementDto, DBAchievementDto } from 'rest/dto/achievement.dto';
import { AchievementService } from 'gameserver/achievement.service';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { AchievementPercentileService } from 'achievement/achievement-percentile.service';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerAchievementsController {
  constructor(
    private readonly achievementService: AchievementService,
    private readonly achievementPercentileService: AchievementPercentileService,
  ) {}

  @Get('/:id/achievements')
  public async playerAchievements(@Param('id') steamId: string): Promise<AchievementDto[]> {
    const achievements = await this.achievementPercentileService.getPlayerAchievements(steamId);

    const paddedAchievements = Object.keys(AchievementKey)
      .filter((key) => isNaN(Number(key)) && achievements.findIndex((a) => a.achievement_key === AchievementKey[key]) === -1)
      .map((key) => ({ steam_id: steamId, progress: 0, achievement_key: AchievementKey[key], percentile: 0 } as DBAchievementDto));

    return achievements.concat(paddedAchievements).map((it) => ({
      key: it.achievement_key,
      steamId: it.steam_id,
      progress: it.progress,
      percentile: it.percentile || 0,
      checkpoints: this.achievementService.achievementMap.get(it.achievement_key)?.checkpoints || [],
      isComplete: this.achievementService.achievementMap.get(it.achievement_key)?.isFullyComplete(it) || false,
      matchId: it.matchId,
    }));
  }
}
