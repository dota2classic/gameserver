import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { LeaveGameSessionCommand } from 'gameserver/command/LeaveGameSessionCommand/leave-game-session.command';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';

@CommandHandler(LeaveGameSessionCommand)
export class LeaveGameSessionHandler
  implements ICommandHandler<LeaveGameSessionCommand>
{
  private readonly logger = new Logger(LeaveGameSessionHandler.name);

  constructor(
    @InjectRepository(GameServerSessionEntity)
    private readonly gameSessionRepository: Repository<GameServerSessionEntity>,
    @InjectRepository(GameSessionPlayerEntity)
    private readonly sessionPlayerRepository: Repository<GameSessionPlayerEntity>,
  ) {}

  async execute(command: LeaveGameSessionCommand) {
    const res = await this.sessionPlayerRepository.update(
      {
        matchId: command.matchId,
        steamId: command.steamId,
      },
      command.userAbandon
        ? { userAbandoned: true, abandoned: true }
        : { abandoned: true },
    );


    // TODO: somehow we need to send command to the running game server


    if (!res.affected) {
      this.logger.warn("Tried to leave non existing session");
      return;
    }
  }
}
