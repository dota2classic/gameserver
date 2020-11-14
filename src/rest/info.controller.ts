import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import Match from 'gameserver/entity/Match';
import { Repository } from 'typeorm';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerDto, GameSessionDto } from 'rest/dto/info.dto';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';

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
    private readonly gameSessionRepository: GameServerSessionRepository,
  ) {}

  @Get('game_servers')
  public async gameServers(): Promise<GameServerDto[]> {
    return this.gsRep.all().then(t => t.map(this.mapper.mapGameServer));
  }

  @Get('game_sessions')
  public async gameSessions(): Promise<GameSessionDto[]> {
    return this.gameSessionRepository
      .all()
      .then(t => t.map(this.mapper.mapGameSession));
  }
}
