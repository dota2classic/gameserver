import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SavePlayerAbandonCommand } from 'gameserver/command/SavePlayerAbandon/save-player-abandon.command';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { MetricsService } from 'metrics/metrics.service';

@CommandHandler(SavePlayerAbandonCommand)
export class SavePlayerAbandonHandler
  implements ICommandHandler<SavePlayerAbandonCommand>
{
  private readonly logger = new Logger(SavePlayerAbandonHandler.name);

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
    private readonly ebus: EventBus,
    private readonly metrics: MetricsService,
  ) {}

  async execute({ event }: SavePlayerAbandonCommand) {
    // Let them abandon ffs
    this.logger.log("PlayerAbandonEvent", { index: event.abandonIndex });
    if (event.abandonIndex > 0) {
      this.logger.log("Player abandoned not first, not creating crime");
      return;
    }

    const crime = new PlayerCrimeLogEntity(
      event.playerId.value,
      BanReason.ABANDON,
      event.mode,
      event.matchId,
    );

    await this.playerCrimeLogEntityRepository.save(crime);

    this.ebus.publish(new CrimeLogCreatedEvent(crime.id));

    this.metrics.recordAbandon(event.mode);
  }
}
