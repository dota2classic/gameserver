import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { GameServerFindFailedEvent } from 'gateway/events/game-server-find-failed.event';

@CommandHandler(FindGameServerCommand)
export class FindGameServerHandler
  implements ICommandHandler<FindGameServerCommand> {
  private readonly logger = new Logger(FindGameServerHandler.name);

  constructor(
    private readonly gsRepository: GameServerRepository,
    private readonly ebus: EventBus,
  ) {}

  async execute(command: FindGameServerCommand) {
    const gs = await this.gsRepository.find(command.version);

    if (gs) {
      //
      gs.attach(command.roomId);
      gs.commit();
    } else {

      if(command.tries < 5) {
        // we need to schedule new find
        this.ebus.publish(
          new GameServerNotFoundEvent(
            command.roomId,
            command.version,
            command.mode,
            command.radiant,
            command.dire,
            command.averageMMR,
            command.tries
          ),
        );
      }else{
        this.ebus.publish(
          new GameServerFindFailedEvent(command.roomId, command.version, command.mode)
        )
      }
    }
  }
}
