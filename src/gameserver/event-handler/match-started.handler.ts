import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';

@EventsHandler(MatchStartedEvent)
export class MatchStartedHandler implements IEventHandler<MatchStartedEvent> {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchRepository: Repository<MatchEntity>,
  ) {}

  async handle(event: MatchStartedEvent) {
    const m = await this.matchRepository.findOne({
      id: event.matchId,
    });
    if (m) {
      m.started = true;
      await this.matchRepository.save(m);
    }
  }
}
