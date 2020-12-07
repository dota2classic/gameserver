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
import {  PlayerService } from 'rest/service/player.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { HeroStatsDto } from 'rest/dto/hero.dto';

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
    private readonly playerService: PlayerService,
  ) {}

  async execute(
    command: GetPlayerInfoQuery,
  ): Promise<GetPlayerInfoQueryResult> {
    await this.cbus.execute(new MakeSureExistsCommand(command.playerId));

    const mmr = (
      await this.versionPlayerRepository.findOne({
        steam_id: command.playerId.value,
        version: command.version,
      })
    ).mmr;



    const rank = await this.playerService.getRank(
      command.version,
      command.playerId.value,
    );
    const gamesPlayed = await this.playerService.gamesPlayed(
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
      command.playerId.value
    );


    const bestHeroScore = (it: HeroStatsDto): number => {
      const wr = Number(it.wins) / Number(it.games);
      const gamesPlayed = Number(it.games);
      const avgKda = Number(it.kda);
      return gamesPlayed * avgKda + wr * 100;
    };

    const summary = new PlayerOverviewSummary(
      gamesPlayed,
      winrate * 100,
      rank + 1,
      bestHeroes
        .sort((a, b) => bestHeroScore(b) - bestHeroScore(a))
        .slice(0, 3)
        .map(t => t.hero),
    );



    const ban = await this.playerBanRepository.findOne({
      steam_id: command.playerId.value
    });

    return new GetPlayerInfoQueryResult(
      command.playerId,
      command.version,
      mmr,
      recentWinrate,
      summary,
      ban?.asBanStatus() || BanStatus.NOT_BANNED
    );
  }
}
