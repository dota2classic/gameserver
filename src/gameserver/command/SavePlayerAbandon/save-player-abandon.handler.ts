import { CommandBus, CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SavePlayerAbandonCommand } from 'gameserver/command/SavePlayerAbandon/save-player-abandon.command';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { MetricsService } from 'metrics/metrics.service';
import { LeaveGameSessionCommand } from 'gameserver/command/LeaveGameSessionCommand/leave-game-session.command';

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
    private readonly cbus: CommandBus,
  ) {}

  async execute({ event }: SavePlayerAbandonCommand) {
    // Let them abandon ffs
    this.logger.log("PlayerAbandonEvent", { index: event.abandonIndex });


    await this.cbus.execute(
      new LeaveGameSessionCommand(event.playerId.value, event.matchId, false),
    );

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

    this.metrics.recordAbandon(
      event.mode,
      await this.playerCrimeLogEntityRepository.count({
        where: { lobby_type: event.mode, crime: BanReason.ABANDON },
      }),
    );
  }
}
