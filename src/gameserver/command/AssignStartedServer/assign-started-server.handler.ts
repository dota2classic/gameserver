import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AssignStartedServerCommand } from 'gameserver/command/AssignStartedServer/assign-started-server.command';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import { DataSource, Repository } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { SrcdsServerStartedEvent } from 'gateway/events/srcds-server-started.event';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { MatchStartedEvent } from 'gateway/events/match-started.event';
import { GameServerInfo } from 'gateway/shared-types/game-server-info';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import { DotaConnectionState } from 'gateway/shared-types/dota-player-connection-state';

@CommandHandler(AssignStartedServerCommand)
export class AssignStartedServerHandler implements ICommandHandler<AssignStartedServerCommand> {

  private readonly logger = new Logger(AssignStartedServerHandler.name)

  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionEntityRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
    private readonly datasource: DataSource,
  ) {}

  async execute(cmd: AssignStartedServerCommand) {
    this.logger.log("Srcds server started: assigning server url")
    const m = await this.matchEntityRepository.findOneOrFail({
      where: { id: cmd.info.matchId },
    });

    m.server = cmd.server;
    await this.matchEntityRepository.save(m);

    const session = await this.createGameSession(cmd);

    //

    this.ebus.publish(
      new GameSessionCreatedEvent(
        session.url,
        session.matchId,
        session.asSummary(),
      ),
    );

    this.ebus.publish(
      new MatchStartedEvent(
        session.matchId,
        session.asSummary(),
        new GameServerInfo(session.url),
      ),
    );
  }

  private async createGameSession(event: SrcdsServerStartedEvent) {
    return this.datasource.transaction(async (em) => {
      // Session
      const session = new GameServerSessionEntity(
        event.info.matchId,
        event.server,
        event.info.roomId,
        event.info.lobbyType,
        event.info.gameMode,
        event.info.map,
        Dota_GameRulesState.WAIT_FOR_PLAYERS_TO_LOAD,
        0,
      );

      await em.save(GameServerSessionEntity, session);
      this.logger.log(`Game server session created ${event.info.matchId}`)

      // Players
      const players = event.info.players.map(
        (p) =>
          new GameSessionPlayerEntity(
            p.steamId,
            event.info.matchId,
            p.partyId,
            p.team,
            DotaConnectionState.DOTA_CONNECTION_STATE_NOT_YET_CONNECTED,
            false,
          ),
      );
      await em.save(GameSessionPlayerEntity, players);
      session.players = players;

      this.logger.log(`Game server session players created ${event.info.matchId}`)

      return session;
    });
  }
}
