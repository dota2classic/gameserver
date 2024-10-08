import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerRepository } from 'gameserver/repository/game-server.repository';
import { GameServerDto, GameSessionDto } from 'rest/dto/info.dto';
import { GameServerSessionRepository } from 'gameserver/repository/game-server-session.repository';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { CacheTTL } from '@nestjs/cache-manager';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

@Controller('info')
@ApiTags('info')
export class InfoController {
  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<
      GameServerSessionEntity
    >,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    private readonly gsRep: GameServerRepository,
    private readonly gameSessionRepository: GameServerSessionRepository,
  ) {}

  @Get('game_servers')
  public async gameServers(): Promise<GameServerDto[]> {
    return this.gsRep.all().then(t => t.map(this.mapper.mapGameServer));
  }

  @Get('game_sessions')
  public async gameSessions(): Promise<GameSessionDto[]> {
    return this.gameServerSessionModelRepository
      .find()
      .then(t => t.map(this.mapper.mapGameSession));
  }

  @Get('current_online')
  @CacheTTL(10)
  public async getCurrentOnline(): Promise<number> {
    const allSessions = await this.gameServerSessionModelRepository.find();
    return allSessions.reduce(
      (a, b) =>
        a + b.matchInfoJson.players.length,
      0,
    );
  }
}
