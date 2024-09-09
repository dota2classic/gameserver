import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { MatchRecordedEvent } from 'gameserver/event/match-recorded.event';
import FinishedMatch from 'gameserver/entity/finished-match';
import { ItemMap } from 'util/items';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  constructor(
    @InjectRepository(FinishedMatch)
    private readonly matchRepository: Repository<FinishedMatch>,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    @InjectRepository(GameServerSessionModel)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionModel
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: GameResultsEvent) {
    const mInfo = await this.matchEntityRepository.findOne({
      where: { id: event.matchId },
    });

    if (!mInfo) return;

    const m = new FinishedMatch(
      mInfo.id,
      event.winner,
      new Date(event.timestamp * 1000).toUTCString(),
      event.gameMode,
      event.type,
      event.duration,
      event.server,
    );

    await this.matchRepository.save(m);

    for (let i = 0; i < event.players.length; i++) {
      const t = event.players[i];

      if (!t) continue;
      const pim = new PlayerInMatch();

      pim.match = m;
      // kda
      pim.kills = t.kills;
      pim.deaths = t.deaths;
      pim.assists = t.assists;

      // creeps
      pim.denies = t.denies;
      pim.last_hits = t.last_hits;

      // pm
      pim.gpm = t.gpm;
      pim.xpm = t.xpm;

      pim.abandoned = t.abandoned;


      const [item0, item1, item2, item3, item4, item5] = t.items
        .map(
          itemDeprecated =>
            ItemMap.find(it => itemDeprecated.includes(it.name)).id,
        );

      pim.item0 = item0;
      pim.item1 = item1;
      pim.item2 = item2;
      pim.item3 = item3;
      pim.item4 = item4;
      pim.item5 = item5;


      pim.level = t.level;
      pim.playerId = t.steam_id;
      pim.team = t.team;
      pim.hero = t.hero;

      await this.playerInMatchRepository.save(pim);
    }

    await this.ebus.publish(
      new MatchRecordedEvent(
        event.matchId,
        event.winner,
        event.duration,
        event.type,
        event.timestamp,
        event.server,
        event.players,
      ),
    );

    const runningSession = await this.gameServerSessionModelRepository.findOne({
      where: {
        url: event.server,
      },
    });
    if (runningSession) {
      await this.gameServerSessionModelRepository.delete(runningSession.url);
      this.ebus.publish(
        new GameSessionFinishedEvent(
          runningSession.url,
          runningSession.matchId,
          runningSession.matchInfoJson,
        ),
      );
    }
  }
}
