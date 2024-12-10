import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerAbandonedEvent } from 'gateway/events/bans/player-abandoned.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';

@EventsHandler(PlayerAbandonedEvent)
export class PlayerAbandonedHandler
  implements IEventHandler<PlayerAbandonedEvent>
{
  private logger = new Logger(PlayerAbandonedHandler.name);

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: PlayerAbandonedEvent) {
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
    );

    await this.playerCrimeLogEntityRepository.save(crime);

    this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
  }
}
