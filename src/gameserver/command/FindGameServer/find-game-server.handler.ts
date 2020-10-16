import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { GameServerFindFailedEvent } from 'gateway/events/game-server-find-failed.event';
import { GameServerFoundEvent } from 'gateway/events/game-server-found.event';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand> {
  private readonly logger = new Logger(FindGameServerHandler.name);

  constructor(
    private readonly gsRepository: GameServerRepository,
    private readonly ebus: EventBus,
  ) {}

  async execute(command: FindGameServerCommand) {
    const gs = await this.gsRepository.find(command.matchInfo.version);

    if (gs) {
      //
      gs.roomId = command.matchInfo.roomId;
      await this.gsRepository.save(gs.url, gs)
      this.ebus.publish(
        new GameServerFoundEvent(
          gs.url,
          command.matchInfo
        ),
      );
    } else {
      if (command.tries < 5) {
        // we need to schedule new find
        this.ebus.publish(
          new GameServerNotFoundEvent(
            command.matchInfo,
            command.tries,
          ),
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
    }
  }
}
