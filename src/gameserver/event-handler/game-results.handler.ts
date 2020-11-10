import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import Match from 'gameserver/entity/Match';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';

@EventsHandler(GameResultsEvent)
export class GameResultsHandler implements IEventHandler<GameResultsEvent> {
  constructor(
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
  ) {}

  async handle(event: GameResultsEvent) {
    const mInfo = await this.matchEntityRepository.findOne({
      id: event.matchId,
    });

    if (!mInfo) return;

    const m = new Match();
    m.id = mInfo.id;
    m.timestamp = new Date(event.timestamp * 1000).toUTCString();
    m.type = event.type;
    m.duration = event.duration;
    m.radiant_win = event.radiantWin;
    m.server = event.server;
    await this.matchRepository.save(m);

    for (let i = 0; i < event.players.length; i++) {
      const t = event.players[i];
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

      pim.items = t.items.join(',');
      pim.level = t.level;
      pim.playerId = t.steam_id;
      pim.team = t.team;
      pim.hero = t.hero;

      await this.playerInMatchRepository.save(pim);
    }
  }
}
