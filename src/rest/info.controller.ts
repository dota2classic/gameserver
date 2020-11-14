import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import Match from 'gameserver/entity/Match';
import { Repository } from 'typeorm';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerDto } from 'rest/dto/info.dto';

@Controller('info')
@ApiTags('info')
export class InfoController {
  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(Match)
    private readonly matchRepository: Repository<Match>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    private readonly gsRep: GameServerRepository,
  ) {}

  @Get('game_servers')
  public async gameServers(): Promise<GameServerDto[]> {
    return this.gsRep.all().then(t => t.map(this.mapper.mapGameServer));
  }
}
