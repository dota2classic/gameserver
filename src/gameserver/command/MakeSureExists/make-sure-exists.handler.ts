import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { inspect } from 'util';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';

@CommandHandler(MakeSureExistsCommand)
export class MakeSureExistsHandler
  implements ICommandHandler<MakeSureExistsCommand> {
  private readonly logger = new Logger(MakeSureExistsHandler.name);

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
  ) {}

  async execute(command: MakeSureExistsCommand) {
    try {
      await this.makeSureExists(command.id.value, Dota2Version.Dota_681);
    }catch (e){
      this.logger.error(`Error creating new user? ${command.id.value} ${inspect(command)}`)
    }
  }

  private async makeSureExists(steam_id: string, version: Dota2Version) {
    const p = await this.versionPlayerRepository.findOne({
      where: { steam_id, version: Dota2Version.Dota_681 },
    });
    if (!p) {
      const vp = new VersionPlayerEntity();
      vp.steam_id = steam_id;
      vp.version = version;
      vp.mmr = VersionPlayerEntity.STARTING_MMR;
      await this.versionPlayerRepository.save(vp);
    }
  }
}
