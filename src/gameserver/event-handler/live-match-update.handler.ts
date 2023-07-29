import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { ReplayEntity } from 'gameserver/model/replay.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@EventsHandler(LiveMatchUpdateEvent)
export class LiveMatchUpdateHandler implements IEventHandler<LiveMatchUpdateEvent> {
  constructor(
    @InjectRepository(ReplayEntity)
    private readonly replayEntityRepository: Repository<ReplayEntity>,
  ) {}

  async handle(event: LiveMatchUpdateEvent) {
    const r = new ReplayEntity()

    r.content = event;
    r.matchId = event.matchId;
    r.timestamp = event.timestamp;
    await this.replayEntityRepository.save(r);
  }
}
