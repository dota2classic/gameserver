import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { RoomNotReadyEvent } from 'gateway/events/room-not-ready.event';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { BanReason } from 'gateway/shared-types/ban';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';

@EventsHandler(RoomNotReadyEvent)
export class RoomNotReadyHandler implements IEventHandler<RoomNotReadyEvent> {
  constructor(
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
    private readonly ebus: EventBus,
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
  ) {}

  async handle(event: RoomNotReadyEvent) {
    for (let i = 0; i < event.players.length; i++) {
      const crime = new PlayerCrimeLogEntity();
      crime.steam_id = event.players[i].value;
      crime.crime = BanReason.GAME_DECLINE;

      await this.playerCrimeLogEntityRepository.save(crime);

      this.ebus.publish(new CrimeLogCreatedEvent(crime.id));
    }
  }
}
