import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Mapper } from 'rest/mapper';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { GameSeason } from 'gameserver/entity/GameSeason';

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

  @Get('/:version/leaderboard')
  async leaderboard(@Param('version') version: Dota2Version) {
    const currentSeason = await this.gameSeasonRepository.findOne({
      where: {
        start_timestamp: LessThanOrEqual(new Date()),
      },
      order: {
        start_timestamp: 'DESC',
      },
    });

    const leaderboard = await this.versionPlayerRepository.query(`
      select p.steam_id,
             p.mmr
      from version_player p
               left outer join player_in_match pim
               inner join match m on pim."matchId" = m.id
                          on p.steam_id = pim."playerId" and m.timestamp > '${currentSeason.start_timestamp.toUTCString()}' and m.type = 0
      
      group by p.steam_id, p.mmr
      having count(pim) > 0
      order by p.mmr DESC;
`);

    return leaderboard.map(this.mapper.mapLeaderboardEntry);
  }
}
