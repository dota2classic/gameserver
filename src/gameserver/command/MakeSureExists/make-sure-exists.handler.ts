import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { Logger } from "@nestjs/common";
import { MakeSureExistsCommand } from "gameserver/command/MakeSureExists/make-sure-exists.command";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { inspect } from "util";
import { VersionPlayerEntity } from "gameserver/model/version-player.entity";
import { GameSeasonService } from "gameserver/service/game-season.service";
import { StartingMmrService } from "gameserver/service/starting-mmr.service";
import { PlayerEducationLockEntity } from "gameserver/model/player-education-lock.entity";
import PlayerInMatchEntity from "gameserver/model/player-in-match.entity";

@CommandHandler(MakeSureExistsCommand)
export class MakeSureExistsHandler
  implements ICommandHandler<MakeSureExistsCommand>
{
  private readonly logger = new Logger(MakeSureExistsHandler.name);

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(PlayerEducationLockEntity)
    private readonly educationLockRepo: Repository<PlayerEducationLockEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepo: Repository<PlayerInMatchEntity>,
    private readonly gsService: GameSeasonService,
    private readonly startingMmrService: StartingMmrService,
  ) {}

  async execute(command: MakeSureExistsCommand) {
    try {
      await this.makeSureExists(command.id.value);
    } catch (e) {
      this.logger.error(
        `Error creating new user? ${command.id.value} ${inspect(command)}`,
        e,
      );
    }
  }

  private async makeSureExists(steamId: string) {
    const season = await this.gsService.getCurrentSeason();
    const existing = await this.versionPlayerRepository.findOne({
      where: {
        steamId,
        seasonId: season.id,
      },
    });

    if (!existing) {
      await this.versionPlayerRepository
        .createQueryBuilder()
        .insert()
        .values(
          new VersionPlayerEntity(
            steamId,
            await this.startingMmrService.getStartingMMRForSteamId(steamId),
            season.id,
          ),
        )
        .orIgnore()
        .execute();
    }

    const existingLock = await this.educationLockRepo.findOne({ where: { steamId } });
    if (!existingLock) {
      const botGamesQuery = this.playerInMatchRepo
        .createQueryBuilder('pim')
        .innerJoin('pim.match', 'fm')
        .where('pim.playerId = :steamId', { steamId })
        .andWhere('fm.matchmaking_mode IN (:...modes)', { modes: [7, 13] });

      const [totalBotGames, hasBotWins] = await Promise.all([
        botGamesQuery.getCount(),
        botGamesQuery.clone().andWhere('pim.team = fm.winner').getCount().then(c => c > 0),
      ]);

      await this.educationLockRepo
        .createQueryBuilder()
        .insert()
        .values({ steamId, requiredGames: 1, resolved: hasBotWins, totalBotGames, recentKda: 0, recentWinrate: 0 })
        .orIgnore()
        .execute();
    }
  }
}
