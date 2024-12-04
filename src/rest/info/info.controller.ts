import { Body, Controller, Get, Param, ParseIntPipe, Put } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameServerDto, GameSessionDto, MatchmakingModeInfoDto, UpdateGamemodeDto } from 'rest/dto/info.dto';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { CacheTTL } from '@nestjs/cache-manager';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { InfoMapper } from 'rest/info/info.mapper';
import { InfoService } from 'rest/info/info.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerEntity } from 'gameserver/model/game-server.entity';

@Controller("info")
@ApiTags("info")
export class InfoController {
  constructor(
    private readonly mapper: InfoMapper,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    @InjectRepository(GameServerEntity)
    private readonly gameServerEntityRepository: Repository<GameServerEntity>,
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
    private readonly infoService: InfoService,
  ) {}

  @Get("game_servers")
  public async gameServers(): Promise<GameServerDto[]> {
    return this.gameServerEntityRepository
      .find()
      .then((t) => t.map(this.mapper.mapGameServer));
  }

  @Get("game_sessions")
  public async gameSessions(): Promise<GameSessionDto[]> {
    return this.gameServerSessionModelRepository
      .find()
      .then((t) => t.map(this.mapper.mapGameSession));
  }

  @Get("gamemode")
  public async gamemodes(): Promise<MatchmakingModeInfoDto[]> {
    return this.matchmakingModeMappingEntityRepository
      .find()
      .then((t) => t.map(this.mapper.mapMatchmakingMode));
  }

  @Put("gamemode/:mode")
  public async updateGamemode(
    @Param("mode", ParseIntPipe) mode: MatchmakingMode,
    @Body() dto: UpdateGamemodeDto,
  ) {
    await this.infoService.updateGamemode(mode, dto.game_mode, dto.enabled);
  }

  @Get("current_online")
  @CacheTTL(10)
  public async getCurrentOnline(): Promise<number> {
    const allSessions = await this.gameServerSessionModelRepository.find();
    return allSessions.reduce((a, b) => a + b.matchInfoJson.players.length, 0);
  }
}
