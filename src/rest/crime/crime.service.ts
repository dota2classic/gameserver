import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CrimeService {
  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
  ) {
  }



  public async getCrimePage(page: number, perPage: number, ){

  }
}
