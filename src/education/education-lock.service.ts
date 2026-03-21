import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerEducationLockEntity } from 'gameserver/model/player-education-lock.entity';
import { MatchAccessLevel } from 'gateway/shared-types/match-access-level';

@Injectable()
export class EducationLockService {
  constructor(
    @InjectRepository(PlayerEducationLockEntity)
    private readonly educationLockRepo: Repository<PlayerEducationLockEntity>,
  ) {}

  public async getEducationStatus(
    steamId: string,
  ): Promise<{ accessLevel: MatchAccessLevel; readinessProgress: number }> {
    const lock = await this.educationLockRepo.findOne({ where: { steamId } });
    if (!lock || lock.resolved) {
      return { accessLevel: MatchAccessLevel.HUMAN_GAMES, readinessProgress: 1 };
    }
    const accessLevel =
      lock.totalBotGames === 0
        ? MatchAccessLevel.EDUCATION
        : MatchAccessLevel.SIMPLE_MODES;
    const readinessProgress =
      Math.min(lock.totalBotGames, lock.requiredGames) / lock.requiredGames;
    return { accessLevel, readinessProgress };
  }

  public async getMatchAccessLevel(steamId: string): Promise<MatchAccessLevel> {
    return (await this.getEducationStatus(steamId)).accessLevel;
  }

  public async getEducationLock(steamId: string): Promise<PlayerEducationLockEntity | null> {
    return this.educationLockRepo.findOne({ where: { steamId } });
  }

  public async patchEducationLock(
    steamId: string,
    requiredGames: number,
  ): Promise<PlayerEducationLockEntity> {
    await this.educationLockRepo.update({ steamId }, { requiredGames });
    return this.educationLockRepo.findOne({ where: { steamId } });
  }
}
