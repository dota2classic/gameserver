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

export type AchievementUpdateResult = "none" | "progress" | "checkpoint";
export type Progress = number | { progress: number; matchId: number | null };

export abstract class BaseAchievement {
  public abstract key: AchievementKey;
  public abstract checkpoints: number[];

  public static REAL_LOBBY_TYPES = [
    MatchmakingMode.RANKED,
    MatchmakingMode.UNRANKED,
  ];

  public logger = new Logger("Achievement");

  constructor(
    public readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    public readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
  ) {}

  abstract progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<Progress>;

  async getProgress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<AchievementProgress> {
    const p = await this.progress(pim, match);

    return typeof p === "number"
      ? {
          progress: p,
          matchId: match.id,
          hero: pim.hero,
        }
      : {
          progress: p.progress,
          matchId: p.matchId,
          hero: pim.hero,
        };
  }

  public supportsLobbyType(type: MatchmakingMode): boolean {
    return BaseAchievement.REAL_LOBBY_TYPES.includes(type);
  }

  async handleMatch(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
    playerAchievementStatus: AchievementEntity,
  ): Promise<AchievementUpdateResult> {
    if (!this.supportsLobbyType(match.matchmaking_mode)) {
      this.logger.log(`Achievement doesn't support lobby type`, {
        lobby_type: match.matchmaking_mode,
      });
      return "none";
    }
    if (this.isFullyComplete(playerAchievementStatus)) {
      return "none";
    }
    const progress = await this.getProgress(pim, match);
    const currentCheckpoint = this.getCompleteCheckpoint(
      playerAchievementStatus,
    );
    if (progress.progress > playerAchievementStatus.progress) {
      playerAchievementStatus.progress = this.clampProgress(progress.progress);
      playerAchievementStatus.matchId = progress.matchId;
      playerAchievementStatus.hero = progress.hero;
    }

    if (
      this.getCompleteCheckpoint(playerAchievementStatus) > currentCheckpoint
    ) {
      return "checkpoint";
    }

    return "progress";
  }

  public isFullyComplete(ach: AchievementEntity): boolean {
    return this.getCompleteCheckpoint(ach) >= this.checkpoints.length - 1;
  }

  public getCompleteCheckpoint(ach: AchievementEntity): number {
    for (let i = this.checkpoints.length; i >= 0; --i) {
      if (ach.progress >= this.checkpoints[i]) {
        return i;
      }
    }
    return -1;
  }

  public clampProgress(progress: number) {
    const maxProgress = this.checkpoints[this.checkpoints.length - 1];

    return Math.min(progress, maxProgress);
  }
}
