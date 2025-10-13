import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateCrimeLogCommand } from 'gameserver/command/CreateCrimeLog/create-crime-log.command';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@CommandHandler(CreateCrimeLogCommand)
export class CreateCrimeLogHandler
  implements ICommandHandler<CreateCrimeLogCommand>
{
  private readonly logger = new Logger(CreateCrimeLogHandler.name);

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
    private readonly ebus: EventBus,
  ) {}

  async execute(event: CreateCrimeLogCommand) {
    // We don't care about bot games: they are for education

    const crime = new PlayerCrimeLogEntity(
      event.steamId,
      BanReason.GAME_DECLINE,
      event.mode,
      undefined,
    );

    await this.playerCrimeLogEntityRepository.save(crime);

    this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
  }
}
