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
    const mInfo = await this.matchRepository.findOne({
      id: event.matchId,
    });
    if (!mInfo) return;

    const m = new Match();
    m.id = mInfo.id;
    m.timestamp = event.timestamp.toString();
    m.type = event.type;
    m.duration = event.duration;
    m.radiant_win = event.radiantWin;
    m.server = event.server;
    await this.matchRepository.save(m);


    const pims = event.players.map(async t => {
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

      pim.items = t.items.join(",")
      pim.level = t.level;
      pim.playerId = t.steam_id
      pim.team = t.team

      return this.playerInMatchRepository.save(pim)
    });

    await Promise.all(pims)



  }
}
