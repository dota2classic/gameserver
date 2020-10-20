import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import { Repository } from 'typeorm';

@EventsHandler(MatchFinishedEvent)
export class MatchFinishedHandler implements IEventHandler<MatchFinishedEvent> {
  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchRepository: Repository<MatchEntity>,
  ) {}

  async handle(event: MatchFinishedEvent) {
    const m = await this.matchRepository.findOne({
      id: event.matchId,
    });
    if (m) {
      m.finished = true;
      await this.matchRepository.save(m);
    }
  }
}
