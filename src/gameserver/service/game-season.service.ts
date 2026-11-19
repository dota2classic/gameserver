import { Inject, Injectable } from '@nestjs/common';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Cache, CACHE_MANAGER } from '@nestjs/cache-manager';

@Injectable()
export class GameSeasonService {
  private static readonly CACHE_KEY = 'current_season';
  private static readonly CACHE_TTL_MS = 60_000;

  constructor(
    @InjectRepository(GameSeasonEntity)
    private readonly gameSeasonEntityRepository: Repository<GameSeasonEntity>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getCurrentSeason(): Promise<GameSeasonEntity> {
    return this.cacheManager.wrap(
      GameSeasonService.CACHE_KEY,
      () =>
        this.gameSeasonEntityRepository.findOneOrFail({
          where: {
            startTimestamp: LessThanOrEqual(new Date()),
          },
          order: {
            startTimestamp: "DESC",
          },
        }),
      GameSeasonService.CACHE_TTL_MS,
    );
  }
}
