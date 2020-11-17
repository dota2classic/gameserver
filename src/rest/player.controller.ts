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
import { CommandBus } from '@nestjs/cqrs';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { GameServerService } from 'gameserver/gameserver.service';
import { PlayerService } from 'rest/service/player.service';

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
    private readonly gsService: GameServerService,
    private readonly playerService: PlayerService
  ) {}

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

    const rank = await this.playerService.getRank(version, steam_id)

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
    const currentSeason = await this.gsService.getCurrentSeason(version);

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
