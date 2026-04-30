import { StartingMmrService } from "gameserver/service/starting-mmr.service";
import { VersionPlayerEntity } from "gameserver/model/version-player.entity";
import { Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import { GameSeasonService } from "gameserver/service/game-season.service";

@Injectable()
export class MockStartingMmrService extends StartingMmrService {
  constructor(
    versionPlayerRepository: Repository<VersionPlayerEntity>,
    gsService: GameSeasonService,
  ) {
    super(versionPlayerRepository, gsService);
  }

  async getStartingMMRForSteamId(steamId: string): Promise<number> {
    return VersionPlayerEntity.STARTING_MMR;
  }
}
