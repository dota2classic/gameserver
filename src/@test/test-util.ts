import { Injectable } from '@nestjs/common';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class TestDataService {
  constructor(
    @InjectRepository(GameSeason)
    private readonly gameSeasonRepository: Repository<GameSeason>,
  ) {}

  public async init() {
    const gs1 = new GameSeason();
    gs1.id = 1;
    gs1.start_timestamp = new Date('2020-07-07 00:00:00.000000');
    gs1.version = Dota2Version.Dota_681;
    await this.gameSeasonRepository.save(gs1);

    const gs2 = new GameSeason();
    gs2.id = 2;
    gs2.start_timestamp = new Date('2020-08-31 20:00:00.000000');
    gs2.version = Dota2Version.Dota_681;
    await this.gameSeasonRepository.save(gs2);
  }
}
