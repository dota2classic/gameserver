import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { PlayerConnectedEvent } from 'gateway/events/srcds/player-connected.event';
import { InjectRepository } from '@nestjs/typeorm';
import { InteractionType, PlayerIpEntity } from 'gameserver/model/player-ip.entity';
import { Repository } from 'typeorm';
import { Logger } from '@nestjs/common';
import { PlayerQualityService } from 'gameserver/service/player-quality.service';

@EventsHandler(PlayerConnectedEvent)
export class PlayerConnectedHandler
  implements IEventHandler<PlayerConnectedEvent>
{
  private logger = new Logger(PlayerConnectedHandler.name);

  constructor(
    @InjectRepository(PlayerIpEntity)
    private readonly playerIpEntityRepository: Repository<PlayerIpEntity>,
    private readonly playerQuality: PlayerQualityService
  ) {}

  async handle(event: PlayerConnectedEvent) {
    this.logger.log("Handling player connect with ip", {
      steam_id: event.playerId.value,
      match: event.matchId,
    });
    const e = new PlayerIpEntity(
      event.playerId.value,
      event.ip,
      InteractionType.MATCH_CONNECT,
    );
    await this.playerIpEntityRepository.save(e);

    await this.playerQuality.onPlayerIpUpdated(event.playerId.value)
  }
}
