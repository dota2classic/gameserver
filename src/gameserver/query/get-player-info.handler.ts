import { CommandBus, IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { BanStatus, GetPlayerInfoQueryResult } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';
import { GetPlayerInfoQuery } from 'gateway/queries/GetPlayerInfo/get-player-info.query';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MakeSureExistsCommand } from 'gameserver/command/MakeSureExists/make-sure-exists.command';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import { DodgeService } from 'rest/service/dodge.service';

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
    private readonly playerServiceV2: PlayerServiceV2,
    private readonly dodge: DodgeService
  ) {}

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
        `WITH current_season AS
  (SELECT *
   FROM game_season gs
   ORDER BY gs.start_timestamp DESC
   LIMIT 1),
     recent_games AS
  (SELECT (pim.team = fm.winner) AS win,
          (pim.team != fm.winner) AS loss,
          (pim.kills + pim.assists) AS ka,
          (pim.deaths) AS deaths
   FROM player_in_match pim
   LEFT JOIN current_season cs ON TRUE
   INNER JOIN finished_match fm ON fm.id = pim."matchId"
   AND fm.timestamp >= cs.start_timestamp
   WHERE pim."playerId" = $1
     AND fm.matchmaking_mode IN (0,
                                 1)
   ORDER BY fm.timestamp DESC
   LIMIT $2)
SELECT vp.steam_id AS steam_id,
       vp.mmr::int AS mmr,
       (sum(rg.win::int)::float / greatest(1, count(rg)))::float AS winrate,
       avg(rg.ka / greatest(rg.deaths, 1))::float AS recent_kda,
       count(rg) AS games
FROM version_player vp,
     recent_games rg
LEFT JOIN current_season cs ON TRUE
WHERE vp.steam_id = $1
  AND vp.season_id = cs.id
GROUP BY vp.steam_id,
         vp.mmr`,
        [command.playerId.value, 20],
      )
    )[0];

    const humanGamesPlayed = await this.getPlayedGames(command.playerId.value);

    const accessLevel = await this.playerServiceV2.getMatchAccessLevel(command.playerId.value)

    const dodgeList = await this.dodge.getDodgeList(command.playerId.value).then(it => it.map(x => x.dodgedSteamId))

    return new GetPlayerInfoQueryResult(
      command.playerId,
      command.version,
      query?.mmr || 2500,
      query?.winrate || 0.5,
      query?.recent_kda || 1,
      humanGamesPlayed || 0,
      ban?.asBanStatus() || BanStatus.NOT_BANNED,
      accessLevel,
      dodgeList
    );
  }

  private async getPlayedGames(steamId: string): Promise<number> {
    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where('m.matchmaking_mode in (:...modes)', {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })
      .andWhere('pim.playerId = :steam_id', { steam_id: steamId })
      .getCount();
  }
}
