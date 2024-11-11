import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchFailedEvent } from 'gateway/events/match-failed.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerNotLoadedEvent } from 'gateway/events/bans/player-not-loaded.event';
import { Logger } from '@nestjs/common';
import { MatchEntity } from 'gameserver/model/match.entity';

@EventsHandler(MatchFailedEvent)
export class MatchFailedHandler implements IEventHandler<MatchFailedEvent> {
  private logger = new Logger(MatchFailedHandler.name);

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: MatchFailedEvent) {
    const match = await this.matchEntityRepository.findOne({
      where: { id: event.matchId },
    });
    if (!match) {
      this.logger.warn('MatchFailedEvent on non-existing match');
      return;
    }
    //
    this.logger.log(
      `Players failed to load into match ${match.id}: ${event.failedPlayers
        .map(it => it.value)
        .join(',')}`,
    );

    this.ebus.publishAll(
      event.failedPlayers.map(
        pl => new PlayerNotLoadedEvent(pl, event.matchId, match.matchInfoJson.mode),
      ),
    );
  }
}
