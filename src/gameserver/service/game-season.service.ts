import { Injectable } from '@nestjs/common';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';

@Injectable()
export class GameSeasonService {
  constructor(
    @InjectRepository(GameSeasonEntity)
    private readonly gameSeasonEntityRepository: Repository<GameSeasonEntity>,
  ) {}

  public async getCurrentSeason(): Promise<GameSeasonEntity> {
    return this.gameSeasonEntityRepository.findOne({
      where: {
        startTimestamp: LessThanOrEqual(new Date()),
      },
      order: {
        startTimestamp: "DESC",
      },
    });
  }
}
