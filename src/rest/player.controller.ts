import { Body, Controller, Delete, Get, Logger, Param, Post, Query, UseInterceptors } from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import {
  AbandonSessionDto,
  BanStatusDto,
  DodgeListEntryDto,
  DodgePlayerDto,
  LeaderboardEntryPageDto,
  PlayerSummaryDto,
  PlayerTeammateDto,
  PlayerTeammatePage,
  ReportPlayerDto,
  ReportsAvailableDto,
  SmurfData,
  StartRecalibrationDto,
} from 'rest/dto/player.dto';
import { CommandBus, EventBus, QueryBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerService } from 'rest/service/player.service';
import { HeroStatsDto } from 'rest/dto/hero.dto';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { NullableIntPipe } from 'util/pipes';
import { AchievementService } from 'gameserver/achievement.service';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { AchievementDto } from 'rest/dto/achievement.dto';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { makePage } from 'gateway/util/make-page';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { LeaderboardService } from 'gameserver/service/leaderboard.service';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { PlayerFeedbackService } from 'gameserver/service/player-feedback.service';
import { PlayerQualityService } from 'gameserver/service/player-quality.service';
import { LeaveGameSessionCommand } from 'gameserver/command/LeaveGameSessionCommand/leave-game-session.command';
import { DodgeService } from 'rest/service/dodge.service';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { GetReportsAvailableQuery } from 'gateway/queries/GetReportsAvailable/get-reports-available.query';
import { GetReportsAvailableQueryResult } from 'gateway/queries/GetReportsAvailable/get-reports-available-query.result';

@Controller("player")
@ApiTags("player")
export class PlayerController {
  private logger = new Logger(PlayerController.name);

  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(GameSeasonEntity)
    private readonly gameSeasonRepository: Repository<GameSeasonEntity>,
    private readonly cbus: CommandBus,
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
    private readonly gsService: GameServerService,
    private readonly playerService: PlayerService,
    private readonly playerServiceV2: PlayerServiceV2,
    private readonly ebus: EventBus,
    private readonly connection: Connection,
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
    private readonly achievements: AchievementService,
    @InjectRepository(AchievementEntity)
    private readonly achievementEntityRepository: Repository<AchievementEntity>,
    private readonly leaderboardService: LeaderboardService,
    private readonly gameSeasonService: GameSeasonService,
    private readonly report: PlayerFeedbackService,
    private readonly playerQuality: PlayerQualityService,
    private readonly dodge: DodgeService,
    private readonly qbus: QueryBus,
  ) {}

  @Get("/:id/achievements")
  public async playerAchievements(
    @Param("id") steamId: string,
  ): Promise<AchievementDto[]> {
    const ach = Array.from(this.achievements.achievementMap.values());

    const achievementsQ = this.achievementEntityRepository
      .createQueryBuilder("a")
      .leftJoinAndMapOne(
        "a.match",
        FinishedMatchEntity,
        "fm",
        'fm.id = a."matchId"',
      )
      .leftJoinAndMapOne(
        "a.pim",
        PlayerInMatchEntity,
        "pim",
        `pim."playerId" = a.steam_id and pim."matchId" = a."matchId"`,
      )
      .where({ steam_id: steamId });

    const achievements = await achievementsQ.getMany();

    const paddedAchievements = Object.keys(AchievementKey)
      .filter(
        (key) =>
          isNaN(Number(key)) &&
          achievements.findIndex(
            (ach) => ach.achievement_key === AchievementKey[key],
          ) === -1,
      )
      .map(
        (key) =>
          ({
            steam_id: steamId,
            progress: 0,
            achievement_key: AchievementKey[key],
          }) as AchievementEntity,
      );

    return achievements.concat(paddedAchievements).map((t) => {
      if (t.match) {
        t.match.players = [];
      }
      return this.mapper.mapAchievement(t);
    });
  }

  @ApiQuery({
    name: "page",
    required: true,
  })
  @ApiQuery({
    name: "per_page",
    required: false,
  })
  @Get(`/:id/teammates`)
  async playerTeammates(
    @Param("id") steamId: string,
    @Query("page", NullableIntPipe) page: number,
    @Query("per_page", NullableIntPipe) perPage: number = 25,
  ): Promise<PlayerTeammatePage> {
    const totalEntries = await this.connection.query<{ count: number }[]>(
      `select count(distinct pim."playerId")::int
from player_in_match pim
         inner join finished_match fm on fm.id = pim."matchId"
         inner join player_in_match match_players
                    on match_players."matchId" = fm.id and match_players."playerId" = $1

where match_players.team = pim.team
  and pim."playerId" != $1 and LENGTH(pim."playerId") > 2`,
      [steamId],
    );

    const data = await this.connection.query<PlayerTeammateDto[]>(
      `with teammates as (select distinct pim."playerId",
                          count(pim)                        as games,
                          sum((pim.team = fm.winner)::int)  as wins,
                          sum((pim.team != fm.winner)::int) as losses
                   from player_in_match pim
                            inner join finished_match fm on fm.id = pim."matchId"
                            inner join player_in_match mp on mp."matchId" = pim."matchId" and mp.team = pim.team and
                                                             mp."playerId" = $1 and fm.matchmaking_mode in (0, 1)
                   where pim."playerId" != $1 and length(pim."playerId") > 2
                   group by pim."playerId"
                   order by wins DESC)
select p."playerId"                                                                             as steam_id,
       p.games::int                                                                             as games,
       p.wins::int                                                                              as wins,
       p.losses::int                                                                            as losses,
       (p.wins::float / greatest(1, p.wins + p.losses))::float                                  as winrate,
       (log(p.games + 1) * (p.wins::float / greatest(1, p.games)) * (p.wins - p.losses))::float as score2

from teammates p
-- order by p.wins desc, p.losses asc;
order by score2 desc, steam_id desc
offset $2 limit $3`,
      [steamId, perPage * page, perPage],
    );

    return {
      data,
      page,
      perPage,
      pages: Math.ceil(totalEntries[0].count / perPage),
    };
  }

  // @UseInterceptors(CacheInterceptor)
  // @CacheTTL(10_000)
  @Get("/summary/:id")
  async playerSummary(@Param("id") steamId: string): Promise<PlayerSummaryDto> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steamId)));

    const [summary, reports] = await Promise.combine([
      this.leaderboardService.getPlayerSummary(steamId),
      this.report.getPlayerReportState(steamId),
    ]);
    return {
      ...summary,
      reports: reports.playerAspects,
    };
  }

  @UseInterceptors(CacheInterceptor)
  @CacheTTL(10_000)
  @Get("/reports/:id")
  async reportsAvailable(
    @Param("id") steamId: string,
  ): Promise<ReportsAvailableDto> {
    const r = await this.qbus.execute<
      GetReportsAvailableQuery,
      GetReportsAvailableQueryResult
    >(new GetReportsAvailableQuery(new PlayerId(steamId)));

   return {
     count: r.available
   }
  }

  @Get("/leaderboard")
  @ApiQuery({
    name: "page",
    required: true,
  })
  @ApiQuery({
    name: "per_page",
    required: false,
  })
  @ApiQuery({
    name: "season_id",
    required: false,
  })
  async leaderboard(
    @Query("page", NullableIntPipe) page: number,
    @Query("per_page", NullableIntPipe) perPage: number = 100,
    @Query("season_id", NullableIntPipe) seasonId?: number,
  ): Promise<LeaderboardEntryPageDto> {
    const [data, total] = await this.leaderboardViewRepository.findAndCount({
      where: {
        seasonId:
          seasonId ||
          (await this.gameSeasonService.getCurrentSeason().then((it) => it.id)),
      },
      order: {
        rank: "ASC",
        mmr: "DESC",
      },
      take: perPage,
      skip: perPage * page,
    });

    return makePage(data, total, page, perPage, (r) => r);
  }

  @CacheTTL(120)
  @Get(`/summary/heroes/:id`)
  async playerHeroSummary(
    @Param("id") steamId: string,
  ): Promise<HeroStatsDto[]> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steamId)));

    return await this.playerService.heroStats(steamId);
  }

  @Get("/hero/:hero/players")
  async getHeroPlayers(@Param("hero") hero: string) {
    return this.playerService.getHeroPlayers(hero);
  }

  @Get(`/ban_info/:id`)
  async banInfo(@Param("id") steam_id: string): Promise<BanStatusDto> {
    const ban = await this.playerBanRepository.findOne({
      where: { steam_id: steam_id },
    });

    const res: BanStatus = ban?.asBanStatus() || BanStatus.NOT_BANNED;

    return {
      steam_id,
      ...res,
    };
  }

  @Get("/smurf_data/:id")
  async smurfData(@Param("id") steamId: string): Promise<SmurfData> {
    this.logger.log("Get smurf data for " + steamId);
    const data = await this.playerQuality.getSmurfData(steamId);
    return {
      relatedBans: data.map((info) => ({
        steam_id: info.steam_id,
        isBanned: info.end_time && info.end_time.getTime() > Date.now(),
        // iso
        bannedUntil:
          (info.end_time && info.end_time.toISOString()) ||
          new Date(0).toISOString(),

        status: info.reason,
      })),
    };
  }

  @Post("/report")
  async reportPlayer(@Body() dto: ReportPlayerDto) {
    await this.report.handlePlayerReport(
      dto.reporterSteamId,
      dto.reportedSteamId,
      dto.aspect,
      dto.matchId,
    );
  }

  @Get("/dodge_list")
  async getDodgeList(
    @Query("steamId") steamId: string,
  ): Promise<DodgeListEntryDto[]> {
    return this.dodge
      .getDodgeList(steamId)
      .then((all) => all.map(this.mapper.mapDodgeEntry));
  }

  @Post("/dodge_list")
  async dodgePlayer(@Body() dto: DodgePlayerDto): Promise<DodgeListEntryDto[]> {
    return this.dodge
      .dodgePlayer(dto.steamId, dto.toDodgeSteamId)
      .then((all) => all.map(this.mapper.mapDodgeEntry));
  }

  @Delete("/dodge_list")
  async unDodgePlayer(
    @Body() dto: DodgePlayerDto,
  ): Promise<DodgeListEntryDto[]> {
    return this.dodge
      .unDodgePlayer(dto.steamId, dto.toDodgeSteamId)
      .then((all) => all.map(this.mapper.mapDodgeEntry));
  }

  @Post("/start_recalibration")
  async startRecalibration(@Body() dto: StartRecalibrationDto) {
    await this.playerServiceV2.startRecalibration(dto.steamId);
  }

  @Post("/abandon")
  async abandonSession(@Body() dto: AbandonSessionDto) {
    await this.cbus.execute(
      new LeaveGameSessionCommand(dto.steamId, dto.matchId),
    );
  }
}
