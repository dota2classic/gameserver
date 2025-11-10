import { Body, Controller, Get, Param, ParseIntPipe, Put, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  AggregatedStatsDto,
  GameSeasonDto,
  GameServerDto,
  GameSessionDto,
  MatchmakingModeInfoDto,
  UpdateGamemodeDto,
} from 'rest/dto/info.dto';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { CacheTTL } from '@nestjs/cache-manager';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { InfoMapper } from 'rest/info/info.mapper';
import { InfoService } from 'rest/info/info.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerEntity } from 'gameserver/model/game-server.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';

@Controller("info")
@ApiTags("info")
@UseInterceptors(ReqLoggingInterceptor)
export class InfoController {
  constructor(
    private readonly mapper: InfoMapper,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    @InjectRepository(GameServerEntity)
    private readonly gameServerEntityRepository: Repository<GameServerEntity>,
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
    @InjectRepository(GameSeasonEntity)
    private readonly gameSeasonEntityRepository: Repository<GameSeasonEntity>,
    private readonly infoService: InfoService,
  ) {}

  @Get("game_servers")
  public async gameServers(): Promise<GameServerDto[]> {
    return this.gameServerEntityRepository
      .find()
      .then((t) => t.map(this.mapper.mapGameServer));
  }

  @Get("seasons")
  public async getSeasons(): Promise<GameSeasonDto[]> {
    const some = await this.gameSeasonEntityRepository
      .createQueryBuilder("gs")
      .addSelect("gs.id = max(gs.id) over ()", "is_active")
      .getRawMany<{
        gs_id: number;
        gs_start_timestamp: Date;
        is_active: boolean;
      }>();

    return some.map(this.mapper.mapGameSeason);
  }

  @Get("game_sessions")
  public async gameSessions(): Promise<GameSessionDto[]> {
    return this.gameServerSessionModelRepository
      .find({ relations: ["players"] })
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
    await this.infoService.updateGamemode(
      mode,
      dto.game_mode,
      dto.dota_map,
      dto.enabled,
      dto.enableCheats,
      dto.fillBots,
      dto.patch,
    );
  }

  @Get("current_online")
  @CacheTTL(10)
  public async getCurrentOnline(): Promise<number> {
    const allSessions = await this.gameServerSessionModelRepository.find({
      relations: ["players"],
    });
    return allSessions.reduce((a, b) => a + b.players.length, 0);
  }

  @Get("aggregated_stats")
  public async getAggregatedStats(): Promise<AggregatedStatsDto> {
    const result: {
      players_yesterday: number;
      players_last_week: number;
      games_last_week: number;
    }[] = await this.gameServerEntityRepository.query(
      `
      SELECT (COUNT(DISTINCT pim."playerId") filter (
                                              WHERE fm.timestamp >= CURRENT_DATE - interval '1 day'
                                                AND fm.timestamp < CURRENT_DATE))::int AS players_yesterday,
       (COUNT(DISTINCT pim."playerId") filter (
                                              WHERE fm.timestamp >= CURRENT_DATE - interval '7 days'
                                                AND fm.timestamp < CURRENT_DATE))::int AS players_last_week,
       (COUNT(DISTINCT fm.id) filter (
                                     WHERE fm.timestamp >= CURRENT_DATE - interval '7 days'
                                       AND fm.timestamp < CURRENT_DATE
                                       AND fm.matchmaking_mode IN (0, 1, 11)))::int AS games_last_week
FROM player_in_match pim
INNER JOIN finished_match fm ON fm.id = pim."matchId";
      `,
    );

    return {
      playersWeekly: result[0].players_last_week,
      humanGamesWeekly: result[0].games_last_week,
      playersYesterday: result[0].players_yesterday,
    };
  }
}
