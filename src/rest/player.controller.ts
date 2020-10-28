import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, MoreThan, Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { GameSeason } from 'gameserver/entity/GameSeason';
import { LeaderboardEntryDto, PlayerSummaryDto } from 'rest/dto/player.dto';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

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
  ) {}

  @Get('/summary/:version/:id')
  async playerSummary(
    @Param('version') version: Dota2Version,
    @Param('id') steam_id: Dota2Version,
  ): Promise<PlayerSummaryDto> {
    const p = await this.versionPlayerRepository.findOne({
      steam_id,
      version,
    });

    const rank = await this.versionPlayerRepository.count({
      where: {
        version,
        mmr: MoreThan(p.mmr),
      },
    });

    return {
      mmr: p.mmr,
      steam_id: p.steam_id,
      rank: rank + 1,
    };
  }

  @Get('/leaderboard/:version')
  async leaderboard(
    @Param('version') version: Dota2Version,
  ): Promise<LeaderboardEntryDto[]> {
    const currentSeason = await this.gameSeasonRepository.findOne({
      where: {
        start_timestamp: LessThanOrEqual(new Date()),
      },
      order: {
        start_timestamp: 'DESC',
      },
    });

    const calibrationGames = 1;

    const leaderboard = await this.versionPlayerRepository.query(`
      select p.steam_id,
             p.mmr
      from version_player p
               left outer join player_in_match pim
               inner join match m on pim."matchId" = m.id
                          on p.steam_id = pim."playerId" and m.timestamp > '${currentSeason.start_timestamp.toUTCString()}' and m.type = ${
      MatchmakingMode.RANKED
    }
      
      group by p.steam_id, p.mmr
      having count(pim) >= ${calibrationGames}
      order by p.mmr DESC;
`);

    return leaderboard.map(this.mapper.mapLeaderboardEntry);
  }
}
