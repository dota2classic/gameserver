import { Controller } from '@nestjs/common';
import { Constructor, EventBus } from '@nestjs/cqrs';
import { EventPattern } from '@nestjs/microservices';
import { PlayerBanHammeredEvent } from 'gateway/events/bans/player-ban-hammered.event';

@Controller()
export class ModerationRedisListener {
  constructor(private readonly ebus: EventBus) {}

  private event<T>(constructor: Constructor<T>, data: any) {
    const buff = data;
    buff.__proto__ = constructor.prototype;
    this.ebus.publish(buff);
  }

  @EventPattern(PlayerBanHammeredEvent.name)
  async PlayerBanHammeredEvent(data: PlayerBanHammeredEvent) {
    this.event(PlayerBanHammeredEvent, data);
  }
}
