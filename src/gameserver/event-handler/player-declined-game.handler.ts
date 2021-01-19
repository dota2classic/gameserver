import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerDeclinedGameEvent } from 'gateway/events/mm/player-declined-game.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(PlayerDeclinedGameEvent)
export class PlayerDeclinedGameHandler
  implements IEventHandler<PlayerDeclinedGameEvent> {
  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    private readonly ebus: EventBus
  ) {}

  async handle(event: PlayerDeclinedGameEvent) {
    const crime = new PlayerCrimeLogEntity();
    crime.steam_id = event.id.value;
    crime.crime = BanReason.GAME_DECLINE;

    await this.playerCrimeLogEntityRepository.save(crime);

    this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
  }
}
