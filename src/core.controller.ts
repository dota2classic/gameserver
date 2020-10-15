import { EventPattern } from '@nestjs/microservices';
import { Controller, Logger } from '@nestjs/common';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { inspect } from 'util';
import { Constructor, EventBus } from '@nestjs/cqrs';

@Controller()
export class CoreController {
  constructor(private readonly ebus: EventBus) {}
  private readonly logger = new Logger(CoreController.name);

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    this.ebus.publish(buff);
    this.logger.log(inspect(buff));
  }

  @EventPattern(RoomReadyEvent.name)
  async RoomReadyEvent(data: RoomReadyEvent) {
    console.log(`Room readY????`)
    this.event(RoomReadyEvent, data);
  }
}
