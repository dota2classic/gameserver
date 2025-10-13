import { StartingMmrService } from 'gameserver/service/starting-mmr.service';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { Injectable } from '@nestjs/common';

@Injectable()
export class MockStartingMmrService extends StartingMmrService {
  async getStartingMMRForSteamId(steamId: string): Promise<number> {
    return VersionPlayerEntity.STARTING_MMR;
  }
}
