import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { AttachReplayCommand } from 'gameserver/command/AttachReplayCommand/attach-replay.command';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@CommandHandler(AttachReplayCommand)
export class AttachReplayHandler
  implements ICommandHandler<AttachReplayCommand>
{
  private readonly logger = new Logger(AttachReplayHandler.name);

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
  ) {}

  async execute(command: AttachReplayCommand) {
    await this.finishedMatchEntityRepository.update(
      {
        id: command.matchId,
      },
      { replayPath: command.key },
    );
    this.logger.log(
      `Attached replay "${command.key}" to match ${command.matchId}`,
    );
  }
}
