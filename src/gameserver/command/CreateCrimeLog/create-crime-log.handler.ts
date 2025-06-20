import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateCrimeLogCommand } from 'gameserver/command/CreateCrimeLog/create-crime-log.command';

@CommandHandler(CreateCrimeLogCommand)
export class CreateCrimeLogHandler implements ICommandHandler<CreateCrimeLogCommand> {

  private readonly logger = new Logger(CreateCrimeLogHandler.name)

  constructor() {

  }

  async execute(command: CreateCrimeLogCommand) {

  }

}
