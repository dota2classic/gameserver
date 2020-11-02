import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { InjectRepository } from '@nestjs/typeorm';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@CommandHandler(MakeSureExistsCommand)
export class MakeSureExistsHandler
  implements ICommandHandler<MakeSureExistsCommand> {
  private readonly logger = new Logger(MakeSureExistsHandler.name);

  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
  ) {}

  async execute(command: MakeSureExistsCommand) {
    // noinspection UnnecessaryLocalVariableJS
    const steamId = command.id.value;
    await this.makeSureExists(steamId, Dota2Version.Dota_681);
  }

  private async makeSureExists(steam_id: string, version: Dota2Version) {
    const p = await this.versionPlayerRepository.findOne({
      steam_id,
      version: Dota2Version.Dota_681,
    });
    if (!p) {
      const vp = new VersionPlayer();
      vp.steam_id = steam_id;
      vp.version = version;
      vp.mmr = 2000;
      await this.versionPlayerRepository.save(vp);
    }
  }
}
