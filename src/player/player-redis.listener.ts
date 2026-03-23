import { Controller } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { EventPattern } from '@nestjs/microservices';
import { UserMightExistEvent } from 'gateway/events/user/user-might-exist.event';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';

@Controller()
export class PlayerRedisListener {
  constructor(private readonly cbus: CommandBus) {}

  @EventPattern(UserMightExistEvent.name)
  async UserMightExistEvent(data: UserMightExistEvent) {
    await this.cbus.execute(new MakeSureExistsCommand(data.id));
  }
}
