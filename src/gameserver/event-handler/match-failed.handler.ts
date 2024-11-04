import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchFailedEvent } from 'gateway/events/match-failed.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { Logger } from '@nestjs/common';

@EventsHandler(MatchFailedEvent)
export class MatchFailedHandler implements IEventHandler<MatchFailedEvent> {
  private logger = new Logger(MatchFailedHandler.name);

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: MatchFailedEvent) {
    //
    this.logger.log(
      `Players failed to load: ${event.failedPlayers
        .map(it => it.value)
        .join(',')}`,
    );
    this.ebus.publishAll(
      event.failedPlayers.map(
        pl => new PlayerNotLoadedEvent(pl, event.matchId),
      ),
    );
  }
}
