import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { LiveMatchUpdateEvent } from 'gateway/events/gs/live-match-update.event';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ) {}

  async handle(event: LiveMatchUpdateEvent) {
    const session = await this.sessionRepo.findOne({
      where: {
        matchId: event.matchId,
      },
      relations: ["players"],
    });

    if (!session) return;

    await this.sessionRepo.update(
      { matchId: event.matchId },
      {
        timestamp: new Date(event.timestamp * 1000),
        gameState: event.game_state,
        gameMode: event.game_mode,
        matchmaking_mode: event.matchmaking_mode,
        duration: event.duration,
      },
    );

    await Promise.all(
      session.players.map((plr) => {
        const hero = event.heroes.find((it) => it.steam_id === plr.steamId);
        if (!hero || hero.connection === plr.connection) return;

        return this.plrRepo.update(
          { steamId: plr.steamId, matchId: plr.matchId },
          { connection: hero.connection },
        );
      }),
    );
  }
}
