import { Controller, Get, Param, Query, UseFilters, UseInterceptors } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { MatchDto, MatchPageDto } from 'rest/dto/match.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { NullableIntPipe } from 'util/pipes';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchService } from './match.service';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { makePage } from 'gateway/util/make-page';
import { MatchMapper } from 'rest/match/match.mapper';
import { EntityNotFoundFilter } from 'rest/exception/entity-not-found.filter';
import { PlayerFeedbackService } from 'gameserver/service/player-feedback.service';
import { MatchReportMatrixDto } from 'rest/dto/player.dto';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { CommandBus } from '@nestjs/cqrs';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';

@Controller("match")
@ApiTags("match")
@UseInterceptors(ReqLoggingInterceptor)
export class MatchController {
  constructor(
    private readonly mapper: MatchMapper,
    @InjectRepository(FinishedMatchEntity)
    private readonly matchRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(MmrChangeLogEntity)
    private readonly mmrChangeLogEntityRepository: Repository<MmrChangeLogEntity>,
    // private readonly metaService: MetaService,
    private readonly matchService: MatchService,
    private readonly playerReportService: PlayerFeedbackService,
    private readonly cbus: CommandBus,
  ) {}

  // remove meta service from here
  @ApiQuery({
    name: "page",
    required: true,
  })
  @ApiQuery({
    name: "per_page",
    required: false,
  })
  @ApiQuery({
    name: "hero",
  })
  @Get("/by_hero")
  async heroMatches(
    @Query("page", NullableIntPipe) page: number,
    @Query("per_page", NullableIntPipe) perPage: number = 25,
    @Query("hero") hero: string,
  ): Promise<MatchPageDto> {
    const raw = await this.matchService.heroMatches(page, perPage, hero);

    return {
      ...raw,
      data: raw.data.map(this.mapper.mapMatch),
    };
  }

  @ApiQuery({
    name: "page",
    required: true,
  })
  @ApiQuery({
    name: "per_page",
    required: false,
  })
  @ApiQuery({
    name: "mode",
    required: false,
  })
  @Get("/all")
  async matches(
    @Query("page", NullableIntPipe) page: number,
    @Query("per_page", NullableIntPipe) perPage: number = 25,
    @Query("mode") mode?: MatchmakingMode,
  ): Promise<MatchPageDto> {
    const [matches, cnt] = await this.matchService.getMatchPage(
      Math.max(0, page),
      perPage <= 0 ? 25 : perPage,
      mode,
    );
    return makePage(matches, cnt, page, perPage, this.mapper.mapMatch);
  }

  @Get("/:id/ranked_process")
  async fake(@Param("id", NullableIntPipe) id: number): Promise<number> {
    const match = await this.matchRepository.findOne({
      where: { id },
      relations: ["players"],
    });
    if (
      match.matchmaking_mode !== MatchmakingMode.UNRANKED &&
      match.matchmaking_mode !== MatchmakingMode.RANKED
    ) {
      return;
    }

    await this.cbus.execute(
      new ProcessRankedMatchCommand(
        match.id,
        match.players
          .filter((t) => t.team === match.winner)
          .map((plr) => plr.playerId),
        match.players
          .filter((t) => t.team !== match.winner)
          .map((plr) => plr.playerId),
        match.matchmaking_mode,
      ),
    );
  }

  @Get("/:id")
  @UseFilters(new EntityNotFoundFilter())
  async getMatch(@Param("id", NullableIntPipe) id: number): Promise<MatchDto> {
    const match = await this.matchRepository.findOneOrFail({
      where: { id },
      relations: ["players", "players.mmrChange"],
    });

    return this.mapper.mapMatch(match);
  }

  @Get("/:id/reportMatrix")
  @UseFilters(new EntityNotFoundFilter())
  async getMatchReportMatrix(
    @Param("id") id: number,
    @Query("steamId") steamId: string,
  ): Promise<MatchReportMatrixDto> {
    const rm = await this.playerReportService.getReportMatrix(id, steamId);
    return {
      matchId: id,
      timestamp: rm.length
        ? new Date(rm[0].match_date).toISOString()
        : new Date(0).toISOString(),
      reports: rm.map((r) => ({
        steamId: r.reported_steam_id,
        reported: r.reporters.filter(Boolean),
      })),
    };
  }

  @ApiQuery({
    name: "page",
    required: true,
  })
  @ApiQuery({
    name: "per_page",
    required: false,
  })
  @ApiQuery({
    name: "mode",
    required: false,
  })
  @ApiQuery({
    name: "hero",
    required: false,
  })
  @Get("/player/:id")
  async playerMatches(
    @Param("id") steam_id: string,
    @Query("page", NullableIntPipe) page: number,
    @Query("per_page", NullableIntPipe) perPage: number = 25,
    @Query("mode", NullableIntPipe) mode?: MatchmakingMode,
    @Query("hero") hero?: string,
  ): Promise<MatchPageDto> {
    const [matches, total] = await this.matchService.getPlayerMatches(
      steam_id,
      Math.max(0, page),
      perPage <= 0 ? 25 : perPage,
      mode,
      hero,
    );

    return makePage(matches, total, page, perPage, this.mapper.mapMatch);
  }
}
