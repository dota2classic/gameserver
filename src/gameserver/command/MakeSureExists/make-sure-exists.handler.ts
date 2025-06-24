import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { inspect } from 'util';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { StartingMmrService } from 'gameserver/service/starting-mmr.service';

@CommandHandler(MakeSureExistsCommand)
export class MakeSureExistsHandler
  implements ICommandHandler<MakeSureExistsCommand>
{
  private readonly logger = new Logger(MakeSureExistsHandler.name);

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
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

  private async makeSureExists(steam_id: string) {
    const season = await this.gsService.getCurrentSeason();

    await this.versionPlayerRepository
      .createQueryBuilder()
      .insert()
      .values(
        new VersionPlayerEntity(
          steam_id,
          await this.startingMmrService.getStartingMMRForSteamId(steam_id),
          season.id,
        ),
      )
      .orIgnore()
      .execute();
  }
}
