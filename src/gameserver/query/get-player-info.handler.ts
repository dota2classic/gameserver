import { CommandBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import {
  BanStatus,
  GetPlayerInfoQueryResult,
  PlayerOverviewSummary,
} from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { GetPlayerInfoQuery } from 'gateway/queries/GetPlayerInfo/get-player-info.query';
import { InjectRepository } from '@nestjs/typeorm';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { Repository } from 'typeorm';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerService } from 'rest/service/player.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { HeroStatsDto } from 'rest/dto/hero.dto';
import { UNRANKED_GAMES_REQUIRED_FOR_RANKED } from 'gateway/shared-types/timings';
import { cached } from 'util/method-cache';
import { Dota2Version } from 'gateway/shared-types/dota2version';

@QueryHandler(GetPlayerInfoQuery)
export class GetPlayerInfoHandler
  implements IQueryHandler<GetPlayerInfoQuery, GetPlayerInfoQueryResult> {
  private readonly logger = new Logger(GetPlayerInfoHandler.name);

  constructor(
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    private readonly cbus: CommandBus,
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
    private readonly playerService: PlayerService
  ) {}


  @cached(60, GetPlayerInfoQuery.name)
  async execute(
    command: GetPlayerInfoQuery,
  ): Promise<GetPlayerInfoQueryResult> {
    await this.cbus.execute(new MakeSureExistsCommand(command.playerId));


    // deprecate multi version mmr
    const mmr = (
      await this.versionPlayerRepository.findOne({
        steam_id: command.playerId.value,
        version: Dota2Version.Dota_681
      })
    ).mmr;

    const rank = await this.playerService.getRank(
      command.version,
      command.playerId.value,
    );
    const rankedGamesPlayed = await this.playerService.gamesPlayed(
      command.playerId.value,
      MatchmakingMode.RANKED,
    );
    const winrate = await this.playerService.winrate(
      command.playerId.value,
      MatchmakingMode.RANKED,
    );
    const bestHeroes = await this.playerService.heroStats(
      command.version,
      command.playerId.value,
    );

    const recentWinrate = await this.playerService.winrateLastRankedGames(
      command.playerId.value,
    );
    const recentKDA = await this.playerService.kdaLastRankedGames(
      command.playerId.value,
    );

    const bestHeroScore = (it: HeroStatsDto): number => {
      const wr = Number(it.wins) / Number(it.games);
      const gamesPlayed = Number(it.games);
      const avgKda = Number(it.kda);
      return gamesPlayed * avgKda + wr * 100;
    };

    const summary = new PlayerOverviewSummary(
      rankedGamesPlayed,
      winrate * 100,
      rank + 1,
      bestHeroes
        .sort((a, b) => bestHeroScore(b) - bestHeroScore(a))
        .slice(0, 3)
        .map(t => t.hero),
      // if there are ranked games played already, this dude can play ranked
      // otherwise we count unranked games left to play
      rankedGamesPlayed > 0
        ? 0
        : Math.max(
            UNRANKED_GAMES_REQUIRED_FOR_RANKED -
              (await this.playerService.getNonRankedGamesPlayed(
                command.playerId.value,
              )),
            0,
          ),
    );

    const ban = await this.playerBanRepository.findOne({
      steam_id: command.playerId.value,
    });




    return new GetPlayerInfoQueryResult(
      command.playerId,
      command.version,
      mmr,
      recentWinrate,
      recentKDA,
      summary,
      ban?.asBanStatus() || BanStatus.NOT_BANNED,
    );
  }
}
