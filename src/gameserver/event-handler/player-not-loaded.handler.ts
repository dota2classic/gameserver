import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BanReason } from 'gateway/shared-types/ban';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';

@EventsHandler(PlayerNotLoadedEvent)
export class PlayerNotLoadedHandler
  implements IEventHandler<PlayerNotLoadedEvent> {
  constructor(
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: PlayerNotLoadedEvent) {
    // Bots are for learning right
    const crime = new PlayerCrimeLogEntity(
      event.playerId.value,
      BanReason.LOAD_FAILURE,
      event.mode
    );

    await this.playerCrimeLogEntityRepository.save(crime);

    this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
  }
}
