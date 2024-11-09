import { CommandBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { BanStatus, GetPlayerInfoQueryResult } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { GetPlayerInfoQuery } from 'gateway/queries/GetPlayerInfo/get-player-info.query';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { PlayerService } from 'rest/service/player.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { cached } from 'util/method-cache';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';

@QueryHandler(GetPlayerInfoQuery)
export class GetPlayerInfoHandler
  implements IQueryHandler<GetPlayerInfoQuery, GetPlayerInfoQueryResult> {
  private readonly logger = new Logger(GetPlayerInfoHandler.name);

  constructor(
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    private readonly cbus: CommandBus,
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
    private readonly playerService: PlayerService,
  ) {}

  @cached(60, GetPlayerInfoQuery.name)
  async execute(
    command: GetPlayerInfoQuery,
  ): Promise<GetPlayerInfoQueryResult> {
    await this.cbus.execute(new MakeSureExistsCommand(command.playerId));

    const ban = await this.playerBanRepository.findOne({
      where: { steam_id: command.playerId.value },
    });

    interface QueryResult {
      version: Dota2Version;
      steam_id: string;
      mmr: number;
      winrate: number;
      recent_kda: number;
    }

    const query: QueryResult | undefined = (
      await this.playerBanRepository.query(
        `with recent_games as (select (pim.team = fm.winner)    as win,
                             (pim.team != fm.winner)   as loss,
                             (pim.kills + pim.assists) as ka,
                             (pim.deaths)              as deaths
                      from player_in_match pim
                               inner join finished_match fm on fm.id = pim."matchId"
                      where pim."playerId" = $1
                        and fm.matchmaking_mode in (0, 1)
                      order by fm.timestamp desc
                      limit $2)
select vp.steam_id                                               as steam_id,
       vp.mmr::int                                                    as mmr,
       vp.version                                                as version,
       (sum(rg.win::int)::float / greatest(1, count(rg)))::float as winrate,
       avg(rg.ka / greatest(rg.deaths, 1))::float                as recent_kda
from version_player vp,
     recent_games rg

where vp.steam_id = $1
group by vp.steam_id, vp.mmr, vp.version`,
        [command.playerId.value, 20],
      )
    )[0];

    const humanGamesPlayed = await this.getPlayedGames(command.playerId.value);

    return new GetPlayerInfoQueryResult(
      command.playerId,
      command.version,
      query?.mmr || 2500,
      query?.winrate || 0.5,
      query?.recent_kda || 1,
      humanGamesPlayed || 0,
      ban?.asBanStatus() || BanStatus.NOT_BANNED,
    );
  }

  private async getPlayedGames(steamId: string): Promise<number> {
    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where(
        'm.matchmaking_mode',
        In([MatchmakingMode.RANKED, MatchmakingMode.UNRANKED]),
      )
      .andWhere('pim.playerId = :steam_id', { steam_id: steamId })
      .getCount();
  }
}
