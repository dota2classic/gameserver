import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SessionEndedEvent } from 'gameserver/event/session-ended.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';
import { ReturnGoodPlayersToQueueEvent } from 'gateway/events/mm/return-good-players-to-queue.event';

@EventsHandler(SessionEndedEvent)
export class SessionEndedHandler implements IEventHandler<SessionEndedEvent> {
  private readonly logger = new Logger(SessionEndedHandler.name);

  constructor(
    private readonly ebus: EventBus,
    private readonly dataSource: DataSource,
  ) {}

  async handle(event: SessionEndedEvent) {
    const session = await this.clearSession(event.serverUrl);

    if (!session) {
      this.logger.log(`No session at ${event.serverUrl}, skipping (idempotent)`);
      return;
    }

    if (event.reason === 'LOAD_FAILURE') {
      const goodSteamIds = session.players
        .filter(p => !event.failedPlayers.includes(p.steamId))
        .map(p => p.steamId);
      this.ebus.publish(
        new ReturnGoodPlayersToQueueEvent(goodSteamIds, session.matchId, session.matchmaking_mode),
      );
    } else {
      this.ebus.publish(new MatchFinishedEvent(session.matchId, session.asSummary()));
    }
  }

  private async clearSession(url: string): Promise<GameServerSessionEntity | null> {
    return this.dataSource.transaction(async (em) => {
      const session = await em.findOne<GameServerSessionEntity>(
        GameServerSessionEntity,
        { where: { url }, relations: ['players'] },
      );
      if (!session) return null;

      await em.remove(GameSessionPlayerEntity, session.players);
      await em.remove(GameServerSessionEntity, session);
      return session;
    });
  }
}
