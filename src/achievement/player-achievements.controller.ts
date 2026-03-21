import { Controller, Get, Param, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { AchievementDto, DBAchievementDto } from 'rest/dto/achievement.dto';
import { AchievementService } from 'gameserver/achievement.service';
import { DataSource } from 'typeorm';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { InjectDataSource } from '@nestjs/typeorm';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerAchievementsController {
  constructor(
    private readonly achievementService: AchievementService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  @Get('/:id/achievements')
  public async playerAchievements(@Param('id') steamId: string): Promise<AchievementDto[]> {
    // TODO: move SQL to AchievementService.getPlayerAchievementsWithPercentile
    const achievements = await this.ds.query<DBAchievementDto[]>(
      `WITH totals AS (
        SELECT achievement_key, COUNT(*) AS total_players, COUNT(*) FILTER (WHERE progress > 0) AS unlocked_players
        FROM achievement_entity GROUP BY achievement_key
      ), per_progress AS (
        SELECT achievement_key, progress, COUNT(*) AS cnt
        FROM achievement_entity GROUP BY achievement_key, progress
      ), cum AS (
        SELECT achievement_key, progress, cnt,
          SUM(cnt) OVER (PARTITION BY achievement_key ORDER BY progress DESC ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS num_ge_progress
        FROM per_progress
      )
      SELECT a.steam_id, a.achievement_key, a.progress, a."matchId",
        CASE WHEN a.progress > 0 THEN c.num_ge_progress::float / t.total_players
             ELSE t.unlocked_players::float / t.total_players END AS percentile
      FROM achievement_entity a
      JOIN totals t USING (achievement_key)
      JOIN cum c ON c.achievement_key = a.achievement_key AND c.progress = a.progress
      WHERE a.steam_id = $1`,
      [steamId],
    );

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
