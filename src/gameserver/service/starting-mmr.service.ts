import { Injectable, Logger } from "@nestjs/common";
import { VersionPlayerEntity } from "gameserver/model/version-player.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GameSeasonService } from "./game-season.service";

@Injectable()
export class StartingMmrService {
  private logger = new Logger(StartingMmrService.name);
  private readonly SEASONAL_COMPRESSION_FACTOR = 0.6;

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    private readonly gsService: GameSeasonService,
  ) {}

  public async getStartingMMRForSteamId(steamId: string) {
    try {
      const currentSeason = await this.gsService.getCurrentSeason();
      const previousSeasonId = currentSeason.id - 1;

      if (previousSeasonId > 0) {
        const previousSeasonPlayer = await this.versionPlayerRepository.findOne({
          where: {
            steamId,
            seasonId: previousSeasonId,
          },
        });

        if (previousSeasonPlayer) {
          const scaledMmr = this.applyLinearScaling(previousSeasonPlayer.mmr);
          this.logger.log(
            `Applying seasonal scaling for ${steamId}: ${previousSeasonPlayer.mmr} -> ${scaledMmr}`,
          );
          return scaledMmr;
        }
      }

      return VersionPlayerEntity.STARTING_MMR;
    } catch (e) {
      this.logger.error(
        `Error getting starting mmr for player ${steamId}! Falling back to static constant`,
        e,
      );
      return VersionPlayerEntity.STARTING_MMR;
    }
  }

  private applyLinearScaling(previousMmr: number): number {
    const target = VersionPlayerEntity.STARTING_MMR;
    return Math.round(target + (previousMmr - target) * this.SEASONAL_COMPRESSION_FACTOR);
  }
}
