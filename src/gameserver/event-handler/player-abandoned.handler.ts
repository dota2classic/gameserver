import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerAbandonedEvent } from 'gateway/events/bans/player-abandoned.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { BanReason } from 'gateway/shared-types/ban';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@EventsHandler(PlayerAbandonedEvent)
export class PlayerAbandonedHandler implements IEventHandler<PlayerAbandonedEvent> {
  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
    private readonly ebus: EventBus
  ) {}

  async handle(event: PlayerAbandonedEvent) {
    // Let them abandon ffs
    if(event.mode === MatchmakingMode.BOTS) return;

    const crime = new PlayerCrimeLogEntity();
    crime.steam_id = event.playerId.value;
    crime.crime = BanReason.ABANDON;
    crime.handled = false;

    await this.playerCrimeLogEntityRepository.save(crime);

    this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
  }
}
