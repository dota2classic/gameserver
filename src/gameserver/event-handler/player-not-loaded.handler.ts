import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ADDITIVE_NOT_LOAD_BAN,
  NOT_LOAD_FIRST_BAN,
} from 'gateway/shared-types/timings';
import { BanReason } from 'gateway/shared-types/ban';

@EventsHandler(PlayerNotLoadedEvent)
export class PlayerNotLoadedHandler
  implements IEventHandler<PlayerNotLoadedEvent> {
  constructor(
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
  ) {}

  async handle(event: PlayerNotLoadedEvent) {
    let ban = await this.playerBanRepository.findOne({
      steam_id: event.playerId.value,
    });

    if (!ban) {
      ban = new PlayerBan();
      ban.steam_id = event.playerId.value;
      const banEndTime = new Date().getTime() + NOT_LOAD_FIRST_BAN;

      ban.endTime = new Date(banEndTime);
      ban.reason = BanReason.LOAD_FAILURE;
      await this.playerBanRepository.save(ban);
    } else if (ban.endTime.getTime() < new Date().getTime()) {
      // ban expired
      const banEndTime = new Date().getTime() + NOT_LOAD_FIRST_BAN;

      ban.endTime = new Date(banEndTime);
      ban.reason = BanReason.LOAD_FAILURE;

      await this.playerBanRepository.save(ban);
    } else {
      // ban is active now
      ban.endTime = new Date(ban.endTime.getTime() + ADDITIVE_NOT_LOAD_BAN);
      await this.playerBanRepository.save(ban);
    }
  }
}
