import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MatchRecordedEvent } from 'gameserver/event/match-recorded.event';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly matchRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
    >,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: GameResultsEvent) {
    const existingRecordedMatch = await this.matchRepository.exists({
      where: {
        id: event.matchId,
      },
    });

    if (existingRecordedMatch) return;

    let modeOverride = (event.type === MatchmakingMode.UNRANKED || event.type === MatchmakingMode.RANKED) && event.players.length !== 10 ? MatchmakingMode.BOTS : event.type;


    // TODO: maybe we should make a transaction here....
    const m = new FinishedMatchEntity(
      event.matchId,
      event.winner,
      new Date(event.timestamp * 1000).toUTCString(),
      event.gameMode,
      modeOverride,
      event.duration,
      event.server,
    );

    m.externalMatchId = event.externalMatchId;

    await this.matchRepository.save(m);

    for (let i = 0; i < event.players.length; i++) {
      const t = event.players[i];

      if (!t) continue;
      const pim = new PlayerInMatchEntity();

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
      pim.hero_damage = t.heroDamage;
      pim.hero_healing = t.heroHealing;
      pim.tower_damage = t.towerDamage;

      pim.abandoned = t.abandoned;
      pim.gold = t.networth;

      pim.item0 = t.item0;
      pim.item1 = t.item1;
      pim.item2 = t.item2;
      pim.item3 = t.item3;
      pim.item4 = t.item4;
      pim.item5 = t.item5;

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
        m.matchmaking_mode,
        m.game_mode,
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
