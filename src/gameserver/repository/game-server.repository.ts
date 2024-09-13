import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { EventPublisher } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GameServerRepository {
  constructor(
    eventPublisher: EventPublisher,
    @InjectRepository(GameServerEntity)
    private readonly gameServerModelRepository: Repository<GameServerEntity>,
  ) {}

  async find(version: Dota2Version): Promise<GameServerEntity[]> {
    return this.gameServerModelRepository.find({
      where: { version, }
    });
  }

  async all() {
    return this.gameServerModelRepository.find()
  }
}
