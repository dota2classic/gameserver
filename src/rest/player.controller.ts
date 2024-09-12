import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { BanStatusDto, LeaderboardEntryDto, PlayerSummaryDto, ReportPlayerDto } from 'rest/dto/player.dto';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerService } from 'rest/service/player.service';
import { HeroStatsDto } from 'rest/dto/hero.dto';
import { UNRANKED_GAMES_REQUIRED_FOR_RANKED } from 'gateway/shared-types/timings';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { PlayerReportEvent } from 'gameserver/event/player-report.event';

@Controller('player')
@ApiTags('player')
export class PlayerController {
  private static leaderboardLimit = 1000;

  constructor(
    private readonly mapper: Mapper,
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(GameSeason)
    private readonly gameSeasonRepository: Repository<GameSeason>,
    private readonly cbus: CommandBus,
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
    private readonly gsService: GameServerService,
    private readonly playerService: PlayerService,
    private readonly ebus: EventBus,
    private readonly connection: Connection,
  ) {}

  @CacheTTL(120)
  @Get('/summary/:version/:id')
  async playerSummary(
    @Param('version') version: Dota2Version,
    @Param('id') steam_id: string,
  ): Promise<PlayerSummaryDto> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steam_id)));

    const summary = await this.playerService.fullSummary(steam_id);

    const rank = await this.playerService.getRank(version, steam_id);

    return {
      mmr: summary.mmr,
      steam_id: summary.steam_id,
      games_played: summary.games_played,
      games_played_all: summary.games_played_all,
      wins: summary.wins,
      loss: summary.loss,
      rank,
      newbieUnrankedGamesLeft:
        summary.ranked_games > 0
          ? 0
          : Math.max(
              0,
              UNRANKED_GAMES_REQUIRED_FOR_RANKED - summary.unranked_games,
            ),
    };
  }

  @Get('/leaderboard/:version')
  @CacheTTL(60 * 30)
  async leaderboard(
    @Param('version') version: Dota2Version,
  ): Promise<LeaderboardEntryDto[]> {
    // return leaderboard.map(this.mapper.mapLeaderboardEntry);
    return await this.connection
      .query<LeaderboardEntryDto[]>(`with cte as (select plr."playerId"                                                                   as steam_id,
                    count(m)                                                                         as games,
                    sum((m.winner = plr.team)::int)                                                  as wins,
                    sum((m.matchmaking_mode = 0 and m.timestamp > now() - '14 days'::interval)::int) as recent_ranked_games,
                    coalesce(p.mmr, -1)                                                              as mmr,
                    sum((m.matchmaking_mode = 0 and m.timestamp > now() - '14 days'::interval)::int) as score
             from player_in_match plr
                      left join version_player p on plr."playerId" = p.steam_id
                      inner join finished_match m on plr."matchId" = m.id and m.matchmaking_mode in (0, 1)
             group by plr."playerId", p.mmr)
select p.steam_id,
       p.wins::int,
       p.games::int,
       (case when p.mmr > 0 and p.recent_ranked_games > 0 then p.mmr else null end)::int as mmr,
       avg(pim.kills)::float   as kills,
       avg(pim.deaths)::float  as deaths,
       avg(pim.assists)::float as assists,
       sum(m.duration)::int    as play_time,
       (case
           when p.recent_ranked_games > 0
               then row_number()
                    over ( partition by
                            p.recent_ranked_games >
                            0 order by p.mmr desc
                        )
           end)::int                 as rank
from cte p
         inner join player_in_match pim on pim."playerId" = p.steam_id
         inner join finished_match m on pim."matchId" = m.id and m.matchmaking_mode in (0, 1)
group by p.steam_id, p.recent_ranked_games, p.mmr, p.games, p.wins
order by rank, games desc limit  500`);
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
