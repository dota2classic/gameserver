import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import {
  BanStatusDto,
  LeaderboardEntryDto,
  PlayerSummaryDto,
  PlayerTeammateDto,
  PlayerTeammatePage,
  ReportPlayerDto,
} from 'rest/dto/player.dto';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerService, Summary } from 'rest/service/player.service';
import { HeroStatsDto } from 'rest/dto/hero.dto';
import { UNRANKED_GAMES_REQUIRED_FOR_RANKED } from 'gateway/shared-types/timings';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { PlayerReportEvent } from 'gameserver/event/player-report.event';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { NullableIntPipe } from 'util/pipes';

@Controller('player')
@ApiTags('player')
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
  ) {}

  @ApiQuery({
    name: 'page',
    required: true,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
  })
  @Get(`/:id/teammates`)
  async playerTeammates(
    @Param('id') steamId: string,
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 25,
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
                            left join player_in_match match_players
                                      on match_players."matchId" = fm.id and match_players."playerId" = $1
                   where match_players is not null
                     and match_players.team = pim.team
                     and pim."playerId" != $1  and LENGTH(pim."playerId") > 2
                   group by pim."playerId")
select p."playerId"                                                                                         as steam_id,
       p.games::int                                                                                         as games,
       p.wins::int                                                                                          as wins,
       p.losses::int                                                                                        as losses,
       (p.wins::float / greatest(1, p.wins + p.losses))::float                                              as winrate,
       (log(p.games + 1) * (p.wins::float / greatest(1, p.games)) * (p.wins - p.losses))::float                                as score2

from teammates p
-- order by p.wins desc, p.losses asc;
order by score2 desc, steam_id desc
offset $2
limit $3`,
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
  @Get('/summary/:version/:id')
  async playerSummary(
    @Param('version') version: Dota2Version,
    @Param('id') steam_id: string,
  ): Promise<PlayerSummaryDto> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steam_id)));

    const lb = await this.leaderboardViewRepository.findOne({
      where: { steam_id },
    });
    // if it exists in the view, we happy
    if (lb) {
      return {
        rank: lb.rank,

        steam_id: lb.steam_id,
        mmr: lb.mmr,

        games: lb.games,
        wins: lb.wins,

        kills: lb.kills,
        deaths: lb.deaths,
        assists: lb.assists,

        play_time: lb.play_time,
        playedAnyGame: lb.any_games > 0,
        newbieUnrankedGamesLeft:
          lb.ranked_games > 0
            ? 0
            : Math.max(0, UNRANKED_GAMES_REQUIRED_FOR_RANKED - lb.games),
      };
    }

    const summary: Summary | undefined = await this.playerService.fullSummary(steam_id);

    const rank = await this.playerService.getRank(version, steam_id);

    return {
      rank: rank,
      mmr: summary?.mmr,
      steam_id: steam_id,

      games: summary?.games || 0,
      wins: summary?.wins || 0,

      kills: summary?.kills || 0,
      deaths: summary?.deaths || 0,
      assists: summary?.assists || 0,
      play_time: summary?.play_time || 0,

      playedAnyGame: summary?.playedAnyGame || false,

      newbieUnrankedGamesLeft:
        (summary?.ranked_games || 0) > 0
          ? 0
          : Math.max(
              0,
              UNRANKED_GAMES_REQUIRED_FOR_RANKED - (summary?.unranked_games || 0),
            ),
    };
  }

  @Get('/leaderboard/:version')
  @CacheTTL(60 * 30)
  async leaderboard(
    @Param('version') version: Dota2Version,
  ): Promise<LeaderboardEntryDto[]> {
    return this.leaderboardViewRepository.find({
      take: 500,
    });
  }

  @CacheTTL(120)
  @Get(`/summary/heroes/:version/:id`)
  async playerHeroSummary(
    @Param('version') version: Dota2Version,
    @Param('id') steam_id: string,
  ): Promise<HeroStatsDto[]> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steam_id)));

    return await this.playerService.heroStats(version, steam_id);
  }

  @Get('/hero/:hero/players')
  async getHeroPlayers(@Param('hero') hero: string) {
    return this.playerService.getHeroPlayers(hero);
  }

  @Get(`/ban_info/:id`)
  async banInfo(@Param('id') steam_id: string): Promise<BanStatusDto> {
    const ban = await this.playerBanRepository.findOne({
      where: { steam_id: steam_id },
    });

    const res: BanStatus = ban?.asBanStatus() || BanStatus.NOT_BANNED;

    return {
      steam_id,
      ...res,
    };
  }

  @Post('/report')
  async reportPlayer(@Body() dto: ReportPlayerDto) {
    this.ebus.publish(
      new PlayerReportEvent(dto.matchId, dto.reporter, dto.reported, dto.text),
    );
  }
}
