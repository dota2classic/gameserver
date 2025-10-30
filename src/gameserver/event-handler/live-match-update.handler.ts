import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';

@EventsHandler(LiveMatchUpdateEvent)
export class LiveMatchUpdateHandler
  implements IEventHandler<LiveMatchUpdateEvent>
{
  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly sessionRepo: Repository<GameServerSessionEntity>,
    @InjectRepository(GameSessionPlayerEntity)
    private readonly plrRepo: Repository<GameSessionPlayerEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async handle(event: LiveMatchUpdateEvent) {
    const session = await this.sessionRepo.findOne({
      where: {
        matchId: event.matchId,
      },
      relations: ["players"],
    });

    if (!session) return;

    await this.dataSource.transaction(async (em) => {
      session.timestamp = new Date(event.timestamp * 1000);
      session.gameState = event.game_state;
      session.gameMode = event.game_mode;
      session.matchmaking_mode = event.matchmaking_mode;
      session.duration = event.duration;

      await em.save(GameServerSessionEntity, session);
      session.players.map((plr) => {
        const matchingPlayer = event.heroes.find(
          (hero) => hero.steam_id === plr.steamId,
        );
        if (!matchingPlayer) return;

        plr.connection = matchingPlayer.connection;
      });

      await em.save(GameSessionPlayerEntity, session.players);
    });
  }
}
