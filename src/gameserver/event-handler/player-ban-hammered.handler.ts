import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerBanHammeredEvent } from 'gateway/events/bans/player-ban-hammered.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';

@EventsHandler(PlayerBanHammeredEvent)
export class PlayerBanHammeredHandler
  implements IEventHandler<PlayerBanHammeredEvent> {
  constructor(
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
  ) {}

  async handle(event: PlayerBanHammeredEvent) {
    let banEnt = await this.playerBanRepository.findOne({
      where: { steam_id: event.playerId.value, }
    });

    if (!banEnt) {
      banEnt = new PlayerBanEntity();
      banEnt.steam_id = event.playerId.value;
    }

    banEnt.endTime = new Date(event.endTime);
    banEnt.reason = event.reason
    await this.playerBanRepository.save(banEnt);
  }
}
