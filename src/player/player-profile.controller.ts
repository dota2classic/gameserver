import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { NullableIntPipe } from 'util/pipes';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { CommandBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { PlayerSummaryDto, PlayerTeammateDto, PlayerTeammatePage } from 'rest/dto/player.dto';
import { HeroStatsDto } from 'rest/dto/hero.dto';
import { LeaderboardService } from 'gameserver/service/leaderboard.service';
import { PlayerFeedbackService } from 'gameserver/service/player-feedback.service';
import { PlayerService } from 'rest/service/player.service';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerProfileController {
  constructor(
    private readonly cbus: CommandBus,
    private readonly leaderboardService: LeaderboardService,
    private readonly report: PlayerFeedbackService,
    private readonly playerService: PlayerService,
    @InjectDataSource() private readonly ds: DataSource,
  ) {}

  @Get('/summary/:id')
  async playerSummary(@Param('id') steamId: string): Promise<PlayerSummaryDto> {
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

  @Get('/summary/heroes/:id')
  async playerHeroSummary(@Param('id') steamId: string): Promise<HeroStatsDto[]> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steamId)));
    return this.playerService.heroStats(steamId);
  }

  @Get('/hero/:hero/players')
  async getHeroPlayers(@Param('hero') hero: string) {
    return this.playerService.getHeroPlayers(hero);
  }

  @ApiQuery({ name: 'page', required: true })
  @ApiQuery({ name: 'per_page', required: false })
  @Get('/:id/teammates')
  async playerTeammates(
    @Param('id') steamId: string,
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 25,
  ): Promise<PlayerTeammatePage> {
    // TODO: move to PlayerService
    const totalEntries = await this.ds.query<{ count: number }[]>(
      `select count(distinct pim."playerId")::int from player_in_match pim
       inner join finished_match fm on fm.id = pim."matchId"
       inner join player_in_match match_players on match_players."matchId" = fm.id and match_players."playerId" = $1
       where match_players.team = pim.team and pim."playerId" != $1 and LENGTH(pim."playerId") > 2`,
      [steamId],
    );
    const data = await this.ds.query<PlayerTeammateDto[]>(
      `with teammates as (select distinct pim."playerId",
                          count(pim) as games, sum((pim.team = fm.winner)::int) as wins,
                          sum((pim.team != fm.winner)::int) as losses
                   from player_in_match pim
                   inner join finished_match fm on fm.id = pim."matchId"
                   inner join player_in_match mp on mp."matchId" = pim."matchId" and mp.team = pim.team
                      and mp."playerId" = $1 and fm.matchmaking_mode in (0, 1)
                   where pim."playerId" != $1 and length(pim."playerId") > 2
                   group by pim."playerId" order by wins DESC)
      select p."playerId" as steam_id, p.games::int as games, p.wins::int as wins, p.losses::int as losses,
             (p.wins::float / greatest(1, p.wins + p.losses))::float as winrate,
             (log(p.games + 1) * (p.wins::float / greatest(1, p.games)) * (p.wins - p.losses))::float as score2
      from teammates p order by score2 desc, steam_id desc offset $2 limit $3`,
      [steamId, perPage * page, perPage],
    );
    return {
      data,
      page,
      perPage,
      pages: Math.ceil(totalEntries[0].count / perPage),
    };
  }
}
