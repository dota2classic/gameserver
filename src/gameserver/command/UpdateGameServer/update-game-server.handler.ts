import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { UpdateGameServerCommand } from 'gameserver/command/UpdateGameServer/update-game-server.command';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerModel } from 'gameserver/model/game-server.model';

@CommandHandler(UpdateGameServerCommand)
export class UpdateGameServerHandler
  implements ICommandHandler<UpdateGameServerCommand> {
  private readonly logger = new Logger(UpdateGameServerHandler.name);

  constructor(private readonly gsRepo: GameServerRepository) {}

  async execute(command: UpdateGameServerCommand) {
    let gs: GameServerModel = await this.gsRepo.get(command.url);
    if (!gs) {
      gs = new GameServerModel(command.url, command.version);
    }


    if(gs.matchID){
      // it's busy or what
    }
  }
}
