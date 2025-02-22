import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { SrcdsServerStartedEvent } from 'gateway/events/srcds-server-started.event';
import { MatchEntity } from 'gameserver/model/match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { GameServerInfo } from 'gateway/shared-types/game-server-info';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import { DotaConnectionState } from 'gateway/shared-types/dota-player-connection-state';
import { Logger } from '@nestjs/common';

@EventsHandler(SrcdsServerStartedEvent)
export class SrcdsServerStartedHandler
  implements IEventHandler<SrcdsServerStartedEvent>
{
  private logger = new Logger(SrcdsServerStartedHandler.name);

  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionEntityRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
    private readonly datasource: DataSource,
  ) {}

  async handle(event: SrcdsServerStartedEvent) {
    this.logger.log("Srcds server started: assigning server url")
    const m = await this.matchEntityRepository.findOneOrFail({
      where: { id: event.matchId },
    });

    m.server = event.server;
    await this.matchEntityRepository.save(m);

    const session = await this.createGameSession(event);

    //

    this.ebus.publish(
      new GameSessionCreatedEvent(
        session.url,
        session.matchId,
        session.asGsMatchInfo(),
      ),
    );

    this.ebus.publish(
      new MatchStartedEvent(
        session.matchId,
        session.asGsMatchInfo(),
        new GameServerInfo(session.url),
      ),
    );
  }

  private async createGameSession(event: SrcdsServerStartedEvent) {
    return this.datasource.transaction(async (em) => {
      // Session
      const session = new GameServerSessionEntity(
        event.matchId,
        event.server,
        event.info.roomId,
        event.info.mode,
        event.info.gameMode,
        event.info.map,
        Dota_GameRulesState.WAIT_FOR_PLAYERS_TO_LOAD,
        0,
      );

      await em.save(GameServerSessionEntity, session);
      this.logger.log(`Game server session created ${event.matchId}`)

      // Players
      const players = event.info.players.map(
        (p) =>
          new GameSessionPlayerEntity(
            p.playerId.value,
            event.matchId,
            p.partyId,
            p.team,
            DotaConnectionState.DOTA_CONNECTION_STATE_NOT_YET_CONNECTED,
            false,
          ),
      );
      await em.save(GameSessionPlayerEntity, players);
      session.players = players;

      this.logger.log(`Game server session players created ${event.matchId}`)

      return session;
    });
  }
}
