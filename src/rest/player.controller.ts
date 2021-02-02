import { Body, CacheTTL, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { GameSeason } from 'gameserver/entity/GameSeason';
import {
  BanStatusDto,
  LeaderboardEntryDto,
  PlayerSummaryDto,
  ReportPlayerDto,
} from 'rest/dto/player.dto';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerService } from 'rest/service/player.service';
import { HeroStatsDto, PlayerGeneralStatsDto } from 'rest/dto/hero.dto';
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

    const p = await this.versionPlayerRepository.findOne({
      steam_id,
      version,
    });

    const rankedGamesPlayed = await this.playerService.gamesPlayed(
      steam_id,
      MatchmakingMode.RANKED,
    );

    const rank = await this.playerService.getRank(version, steam_id);

    return {
      mmr: p.mmr,
      steam_id: p.steam_id,
      rank: rank + 1,
      newbieUnrankedGamesLeft:
        rankedGamesPlayed > 0
          ? 0
          : Math.max(
              UNRANKED_GAMES_REQUIRED_FOR_RANKED -
                (await this.playerService.getNonRankedGamesPlayed(steam_id)),
              0,
            ),
    };
  }

  @Get('/leaderboard/:version')
  @CacheTTL(60 * 30)
  async leaderboard(
    @Param('version') version: Dota2Version,
  ): Promise<LeaderboardEntryDto[]> {
    const calibrationGames = 1;

    const leaderboard = await this.versionPlayerRepository.query(`
      select p.steam_id,
             p.mmr
      from version_player p
               left outer join player_in_match pim
               inner join match m on pim."matchId" = m.id
                          on p.steam_id = pim."playerId" and m.timestamp >= 'now'::timestamp - '1 month'::interval and m.type = ${MatchmakingMode.RANKED}
      
      group by p.steam_id, p.mmr
      having count(pim) >= ${calibrationGames}
      order by p.mmr DESC
      limit 1000;
`);

    return leaderboard.map(this.mapper.mapLeaderboardEntry);
  }

  @CacheTTL(120)
  @Get(`/summary/general/:version/:id`)
  async playerGeneralSummary(
    @Param('version') version: Dota2Version,
    @Param('id') steam_id: string,
  ): Promise<PlayerGeneralStatsDto> {
    await this.cbus.execute(new MakeSureExistsCommand(new PlayerId(steam_id)));

    return await this.playerService.generalStats(version, steam_id);
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

  @Get(`/ban_info/:id`)
  async banInfo(@Param('id') steam_id: string): Promise<BanStatusDto> {
    const ban = await this.playerBanRepository.findOne({
      steam_id: steam_id,
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
