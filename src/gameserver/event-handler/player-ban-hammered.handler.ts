import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerBanHammeredEvent } from 'gateway/events/bans/player-ban-hammered.event';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { Repository } from 'typeorm';
import { BanReason } from 'gateway/shared-types/ban';

@EventsHandler(PlayerBanHammeredEvent)
export class PlayerBanHammeredHandler
  implements IEventHandler<PlayerBanHammeredEvent> {
  constructor(
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
  ) {}

  async handle(event: PlayerBanHammeredEvent) {
    let banEnt = await this.playerBanRepository.findOne({
      steam_id: event.playerId.value,
    });

    if (!banEnt) {
      banEnt = new PlayerBan();
      banEnt.steam_id = event.playerId.value;
      banEnt.reason = BanReason.INFINITE_BAN;
    }

    banEnt.endTime = new Date(event.endTime);
    await this.playerBanRepository.save(banEnt);
  }
}
