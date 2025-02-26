import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import {
  BanStatusDto,
  LeaderboardEntryPageDto,
  PlayerSummaryDto,
  PlayerTeammateDto,
  PlayerTeammatePage,
  ReportPlayerDto,
} from 'rest/dto/player.dto';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerService } from 'rest/service/player.service';
import { HeroStatsDto } from 'rest/dto/hero.dto';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { PlayerReportEvent } from 'gameserver/event/player-report.event';
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

@Controller("player")
@ApiTags("player")
export class PlayerController {
  private static leaderboardLimit = 1000;

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
    private readonly ebus: EventBus,
    private readonly connection: Connection,
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
    private readonly achievements: AchievementService,
    @InjectRepository(AchievementEntity)
    private readonly achievementEntityRepository: Repository<AchievementEntity>,
    private readonly leaderboardService: LeaderboardService,
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

  @CacheTTL(120)
  @Get("/summary/:id")
  async playerSummary(
    @Param("id") steamId: string,
  ): Promise<PlayerSummaryDto> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steamId)));

    return this.leaderboardService.getPlayerSummary(steamId);
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
  async leaderboard(
    @Query("page", NullableIntPipe) page: number,
    @Query("per_page", NullableIntPipe) perPage: number = 100,
  ): Promise<LeaderboardEntryPageDto> {
    const [data, total] = await this.leaderboardViewRepository.findAndCount({
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
  @Get(`/summary/heroes/:version/:id`)
  async playerHeroSummary(
    @Param("version") version: Dota2Version,
    @Param("id") steam_id: string,
  ): Promise<HeroStatsDto[]> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steam_id)));

    return await this.playerService.heroStats(version, steam_id);
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

  @Post("/report")
  async reportPlayer(@Body() dto: ReportPlayerDto) {
    this.ebus.publish(
      new PlayerReportEvent(dto.matchId, dto.reporter, dto.reported, dto.text),
    );
  }
}
