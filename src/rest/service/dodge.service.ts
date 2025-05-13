import { Injectable } from '@nestjs/common';
import { DodgeListEntity } from 'gameserver/model/dodge-list.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class DodgeService {
  public static DODGE_LIST_SIZE = 1;

  constructor(
    @InjectRepository(DodgeListEntity)
    private readonly dodgeListEntityRepository: Repository<DodgeListEntity>,
  ) {}

  public async getDodgeList(steamId: string) {
    return this.dodgeListEntityRepository.find({
      where: {
        steamId,
      },
    });
  }

  public async dodgePlayer(steamId: string, toDodgeSteamId: string) {
    if (steamId === toDodgeSteamId) {
      throw "Invalid argument";
    }
    const dodgeList = await this.getDodgeList(steamId);
    dodgeList.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    const toPrune = dodgeList.length + 1 - DodgeService.DODGE_LIST_SIZE;
    if (toPrune > 0) {
      // Prune oldest
      await this.dodgeListEntityRepository.remove(dodgeList.slice(0, toPrune));
    }
    await this.dodgeListEntityRepository.save({
      steamId,
      dodgedSteamId: toDodgeSteamId,
    });

    return this.getDodgeList(steamId);
  }

  public async unDodgePlayer(steamId: string, toDodgeSteamId: string) {
    await this.dodgeListEntityRepository.delete({
      steamId,
      dodgedSteamId: toDodgeSteamId,
    });
    return this.getDodgeList(steamId);
  }
}
