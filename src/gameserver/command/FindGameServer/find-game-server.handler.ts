import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { GameServerFindFailedEvent } from 'gateway/events/game-server-find-failed.event';
import { GameSessionCreatedEvent } from 'gateway/events/game-session-created.event';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameServerSessionModel } from 'gameserver/model/game-server-session.model';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import { Repository } from 'typeorm';
import { MatchCreatedEvent } from 'gameserver/event/match-created.event';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand> {
  private readonly logger = new Logger(FindGameServerHandler.name);

  constructor(
    private readonly gsRepository: GameServerRepository,
    private readonly gsSessionRepository: GameServerSessionRepository,
    private readonly ebus: EventBus,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
  ) {}

  async execute(command: FindGameServerCommand) {
    const gs = await this.gsSessionRepository.findFree(
      command.matchInfo.version,
    );

    console.log(gs, `a?`, command.matchInfo.version)
    if (!gs) {
      if (command.tries < 5) {
        // we need to schedule new find
        this.ebus.publish(
          new GameServerNotFoundEvent(command.matchInfo, command.tries),
        );
      } else {
        this.ebus.publish(
          new GameServerFindFailedEvent(
            command.matchInfo.roomId,
            command.matchInfo.version,
            command.matchInfo.mode,
          ),
        );
      }
      return;
    }

    const m = new MatchEntity();
    m.server = gs.url;
    m.mode = command.matchInfo.mode;
    m.started = false;

    await this.matchEntityRepository.save(m);

    const session = new GameServerSessionModel(gs.url, m.id, command.matchInfo);
    await this.gsSessionRepository.save(session.url, session);

    this.ebus.publish(new GameSessionCreatedEvent(gs.url, m.id, command.matchInfo));
  }
}