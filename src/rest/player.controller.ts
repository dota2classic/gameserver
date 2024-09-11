import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CacheTTL } from '@nestjs/cache-manager';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { BanStatusDto, LeaderboardEntryDto, PlayerSummaryDto, ReportPlayerDto } from 'rest/dto/player.dto';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
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
      newbieUnrankedGamesLeft: summary.ranked_games > 0 ? 0 : Math.max(0, UNRANKED_GAMES_REQUIRED_FOR_RANKED - summary.unranked_games)
    }
  }

  @Get('/leaderboard/:version')
  @CacheTTL(60 * 30)
  async leaderboard(
    @Param('version') version: Dota2Version,
  ): Promise<LeaderboardEntryDto[]> {
    const calibrationGames = 1;

    // return leaderboard.map(this.mapper.mapLeaderboardEntry);
    return await this.versionPlayerRepository
      .query(`select pim."playerId"                  as steam_id,
       count(pim)                      as games,
       sum((pim.team = m.winner)::int) as wins,
       coalesce(vp.mmr, ${VersionPlayer.STARTING_MMR})::int            as mmr,
       avg(pim.kills)::float           as kills,
       avg(pim.deaths)::float          as deaths,
       avg(pim.assists)::float         as assists,
       sum(m.duration)::int            as play_time
from player_in_match pim
         left outer join finished_match m on m.id = pim."matchId"
         left outer join version_player vp on vp.steam_id = pim."playerId"
where pim."playerId"::decimal > 10
  and m.matchmaking_mode in (${MatchmakingMode.UNRANKED}, ${MatchmakingMode.RANKED})
group by pim."playerId", mmr
order by mmr DESC, games desc
limit 1000`);
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
