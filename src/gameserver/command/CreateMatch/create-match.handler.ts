import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CreateMatchCommand } from 'gameserver/command/CreateMatch/create-match.command';
import { MatchEntity } from 'gameserver/model/match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchCreatedEvent } from 'gameserver/event/match-created.event';

@CommandHandler(CreateMatchCommand)
export class CreateMatchHandler implements ICommandHandler<CreateMatchCommand> {
  private readonly logger = new Logger(CreateMatchHandler.name);

  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly ebus: EventBus,
  ) {}

  async execute(command: CreateMatchCommand) {
    const m = new MatchEntity();
    m.server = command.url;
    m.mode = command.info.mode;
    m.started = false;

    await this.matchEntityRepository.save(m);
    this.ebus.publish(new MatchCreatedEvent(m.id, command.url, command.info));
  }
}
