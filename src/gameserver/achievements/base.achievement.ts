import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { Repository } from 'typeorm';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { Logger } from '@nestjs/common';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export interface AchievementProgress {
  matchId?: number;
  hero?: string;
  progress: number;
}

export abstract class BaseAchievement {
  public abstract key: AchievementKey;
  public abstract maxProgress: number;

  public static REAL_LOBBY_TYPES = [
    MatchmakingMode.RANKED,
    MatchmakingMode.UNRANKED,
  ];

  private logger = new Logger("Achievement");

  constructor(
    protected readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    protected readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
  ) {}

  abstract getProgress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<AchievementProgress>;

  public supportsLobbyType(type: MatchmakingMode): boolean {
    return true;
  }

  async handleMatch(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
    achievement: AchievementEntity,
  ) {
    if (!this.supportsLobbyType(match.matchmaking_mode)) {
      this.logger.log(`Achievement doesn't support lobby type`, {
        lobby_type: match.matchmaking_mode,
      });
      return false;
    }
    if (this.isComplete(achievement)) {
      // We are already good, skip
      this.logger.log(
        `Achievement already complete for player ${pim.playerId} @ ${this.key}`,
      );
      return false;
    }
    const progress = await this.getProgress(pim, match);
    if (progress.progress > achievement.progress) {
      achievement.progress = progress.progress;
    }
    if (this.isComplete(achievement)) {
      achievement.matchId = progress.matchId;
      achievement.hero = progress.hero;
      achievement.progress = progress.progress;
    }

    return true;
  }

  public isComplete(ach: AchievementEntity): boolean {
    return ach.progress >= this.maxProgress;
  }
}
