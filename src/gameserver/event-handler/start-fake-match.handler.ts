import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { StartFakeMatchEvent } from 'gateway/events/start-fake-match.event';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReplayEntity } from 'gameserver/model/replay.entity';
import { MoreThan, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Inject, Injectable } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { construct } from 'gateway/util/construct';

@Injectable()
@EventsHandler(StartFakeMatchEvent)
export class StartFakeMatchHandler
  implements IEventHandler<StartFakeMatchEvent> {
  constructor(
    @InjectRepository(ReplayEntity)
    private readonly replayEntityRepository: Repository<ReplayEntity>,
    @Inject('QueryCore') private readonly redisEventQueue: ClientProxy,
  ) {}

  async handle(event: StartFakeMatchEvent) {
    this.fakeMatchesToRun.push({
      matchId: event.matchId,
      timestamp: 0,
    });
  }

  private readonly fakeMatchesToRun: {
    matchId: number;
    timestamp: number;
  }[] = [];

  @Cron(CronExpression.EVERY_5_SECONDS)
  async fakeMatches() {
    return;
    // console.log("fakematch",this.fakeMatchesToRun);
    const toDelete: number[] = [];
    const stuff = this.fakeMatchesToRun.map(async e => {
      const { matchId, timestamp } = e;

      const newEvent = await this.replayEntityRepository.findOne({
        where: {
          matchId,
          timestamp: MoreThan(timestamp),
        },
        order: {
          timestamp: 'ASC',
        },
      });


      if (newEvent) {
        await this.redisEventQueue.emit(
          LiveMatchUpdateEvent.name,
          newEvent.content
        ).toPromise();
        console.log('emited')
        const r = this.fakeMatchesToRun.find(it => it.matchId === matchId);
        if(r){
          r.timestamp = newEvent.timestamp
        }
      } else {
        toDelete.push(matchId);
      }
    });

    await Promise.all(stuff);
    toDelete.forEach(it => {
      this.fakeMatchesToRun.splice(
        this.fakeMatchesToRun.findIndex(i => i.matchId === it),
        1,
      );
    });
  }
}
