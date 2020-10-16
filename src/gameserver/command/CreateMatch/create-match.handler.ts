import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateMatchCommand } from 'gameserver/command/CreateMatch/create-match.command';

@CommandHandler(CreateMatchCommand)
export class CreateMatchHandler implements ICommandHandler<CreateMatchCommand> {

  private readonly logger = new Logger(CreateMatchHandler.name)

  constructor() {

  }

  async execute(command: CreateMatchCommand) {

  }

}