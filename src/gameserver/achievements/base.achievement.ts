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

export abstract class BaseAchievement {
  public abstract key: AchievementKey;
  public abstract checkpoints: number[];

  public static REAL_LOBBY_TYPES = [
    MatchmakingMode.RANKED,
    MatchmakingMode.UNRANKED,
  ];

  private logger = new Logger("Achievement");

  constructor(
    protected readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    protected readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
  ) {}

  abstract progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<number>;

  async getProgress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<AchievementProgress> {
    const p = await this.progress(pim, match);


    return {
      progress: p,
      matchId: match.id,
      hero: pim.hero,
    };
  }

  public supportsLobbyType(type: MatchmakingMode): boolean {
    return BaseAchievement.REAL_LOBBY_TYPES.includes(type);
  }

  async handleMatch(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
    achievement: AchievementEntity,
  ): Promise<AchievementUpdateResult> {
    if (!this.supportsLobbyType(match.matchmaking_mode)) {
      this.logger.log(`Achievement doesn't support lobby type`, {
        lobby_type: match.matchmaking_mode,
      });
      return "none";
    }
    if (this.isFullyComplete(achievement)) {
      // We are already good, skip
      this.logger.log(
        `Achievement already fully complete for player ${pim.playerId} @ ${this.key}`,
      );
      return "none";
    }
    const progress = await this.getProgress(pim, match);
    const currentCheckpoint = this.getCompleteCheckpoint(achievement);
    if (progress.progress > achievement.progress) {
      achievement.progress = progress.progress;
    }
    const newCheckpoint = this.getCompleteCheckpoint(achievement);

    if (newCheckpoint > currentCheckpoint) {
      achievement.matchId = progress.matchId;
      achievement.hero = progress.hero;
      return "checkpoint";
    }

    return "progress";
  }

  public isFullyComplete(ach: AchievementEntity): boolean {
    return this.getCompleteCheckpoint(ach) >= this.checkpoints.length - 1;
  }

  public getCompleteCheckpoint(ach: AchievementEntity): number {
    return this.checkpoints.findIndex((v) => ach.progress >= v);
  }
}
