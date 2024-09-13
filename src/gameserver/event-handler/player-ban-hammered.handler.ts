import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerBanHammeredEvent } from 'gateway/events/bans/player-ban-hammered.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BanReason } from 'gateway/shared-types/ban';
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
      banEnt.reason = BanReason.INFINITE_BAN;
    }

    banEnt.endTime = new Date(event.endTime);
    await this.playerBanRepository.save(banEnt);
  }
}
