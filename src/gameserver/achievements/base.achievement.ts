import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { Repository } from 'typeorm';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { Logger } from '@nestjs/common';

export interface AchievementProgress {
  matchId?: number;
  hero?: string;
  progress: number;
}

export abstract class BaseAchievement {
  public abstract key: AchievementKey;
  public abstract maxProgress: number;

  private logger = new Logger('Achievement');

  constructor(
    protected readonly finishedMatchEntityRepository: Repository<
      FinishedMatchEntity
    >,
    protected readonly playerInMatchEntityRepository: Repository<
      PlayerInMatchEntity
    >,
  ) {}

  abstract getProgress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<AchievementProgress>;

  async handleMatch(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
    achievement: AchievementEntity,
  ) {
    // this.logger.log(
    //   `Handle match ${match.id} for player ${pim.playerId} @ ${this.key}`,
    // );
    if (this.isComplete(achievement)) {
      // We are already good, skip
      this.logger.log(
        `Achievement already complete for player ${pim.playerId} @ ${this.key}`,
      );
      return false;
    }
    const progress = await this.getProgress(pim, match);
    achievement.progress = progress.progress;
    if (this.isComplete(achievement)) {
      achievement.matchId = progress.matchId;
      achievement.hero = progress.hero;
    }

    return true;
  }

  public isComplete(ach: AchievementEntity): boolean {
    return ach.progress >= this.maxProgress;
  }
}


export enum AchievementKey {
  HARDCORE,
  GPM_1000,
  XPM_1000,
  GPM_XPM_1000,
  LAST_HITS_1000,
  DENIES_50,
  WINSTREAK_10,
  WIN_1HR_GAME,
  WIN_1HR_GAME_AGAINST_TECHIES,
  ALL_HERO_CHALLENGE,
}

