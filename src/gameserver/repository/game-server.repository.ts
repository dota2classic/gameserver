import { GameServerModel } from 'gameserver/model/game-server.model';
import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { EventPublisher } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class GameServerRepository {
  constructor(
    eventPublisher: EventPublisher,
    @InjectRepository(GameServerModel)
    private readonly gameServerModelRepository: Repository<GameServerModel>,
  ) {}

  async find(version: Dota2Version): Promise<GameServerModel[]> {
    return this.gameServerModelRepository.find({
      where: { version, }
    });
  }

  async all() {
    return this.gameServerModelRepository.find()
  }
}
