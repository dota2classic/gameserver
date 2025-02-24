import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';

@Injectable()
export class TestDataService {
  constructor(
    @InjectRepository(GameSeasonEntity)
    private readonly gameSeasonRepository: Repository<GameSeasonEntity>,
  ) {}

  public async init() {
    const gs1 = new GameSeasonEntity();
    gs1.id = 1;
    gs1.start_timestamp = new Date('2020-07-07 00:00:00.000000');
    await this.gameSeasonRepository.save(gs1);

    const gs2 = new GameSeasonEntity();
    gs2.id = 2;
    gs2.start_timestamp = new Date('2020-08-31 20:00:00.000000');
    await this.gameSeasonRepository.save(gs2);
  }
}
