import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UpdateGameServerCommand } from 'gameserver/command/UpdateGameServer/update-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerModel } from 'gameserver/model/game-server.model';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';

@CommandHandler(UpdateGameServerCommand)
export class UpdateGameServerHandler
  implements ICommandHandler<UpdateGameServerCommand> {
  private readonly logger = new Logger(UpdateGameServerHandler.name);

  constructor(private readonly gsRepo: GameServerSessionRepository) {}

  async execute(command: UpdateGameServerCommand) {
    // todo.
    // let gs: GameServerModel = await this.gsRepo.get(command.url);
    // if (!gs) {
    //   gs = new GameServerModel(command.url, command.version);
    // }
    //
    // gs.runtimeInfo = {
    //   matchId: command.matchId,
    // };
    //
    //
    // if (!gs.info) {
    //   // if there is no track of match, we think it's no good
    //   this.logger.error(
    //     `Received update from game server, but no match info was found`,
    //   );
    //   return;
    // }


  }
}
