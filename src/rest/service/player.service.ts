import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Connection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import { HeroStatsDto, PlayerHeroPerformance } from 'rest/dto/hero.dto';
import { cached } from 'util/method-cache';
import { PlayerSummaryDto } from 'rest/dto/player.dto';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';

export type Summary =
  | undefined
  | (Omit<PlayerSummaryDto, "rank" | "newbieUnrankedGamesLeft"> & {
      ranked_games: number;
      unranked_games: number;
      any_games: number;
      bot_wins: number;
    });

// TODO: we probably need to orm this shit up
@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    private readonly gsService: GameServerService,
    private readonly connection: Connection,
  ) {}

  @cached(100, "getRank")
  public async getRank(
    version: Dota2Version,
    steam_id: string,
  ): Promise<number> {
    // Only 681 as version player is deprecated model(same mmr for all)

    const p = await this.versionPlayerRepository.findOne({
      where: {
        steam_id,
        version: Dota2Version.Dota_681,
      },
    });

    const rank2 = await this.connection.query<
      { count: number; pgames: number }[]
    >(
      `
with players as (select p.steam_id, p.mmr, count(pim) as games
             from version_player p
                      left outer join player_in_match pim
                      inner join finished_match m on pim."matchId" = m.id
                                 on p.steam_id = pim."playerId" and
                                    m.matchmaking_mode = $1
             where m.timestamp > now() - '14 days' :: interval
             group by p.steam_id, p.mmr),
     played_games as (select count(*) as games
                  from player_in_match p
                           inner join finished_match m on m.id = p."matchId"
                  where p."playerId" = $2
                    and m.matchmaking_mode = $1
                    and m.timestamp > now() - '14 days' :: interval)
select count(p.steam_id)::int, pg.games::int as pgames
from players p,
     played_games pg
where p.mmr > $3
  and p.games > 0 group by pgames
    `,
      [MatchmakingMode.RANKED, steam_id, p.mmr],
    );

    if (rank2.length === 0) return -1;
    if (rank2[0].pgames === 0) return -1;

    return rank2[0].count + 1;
  }

  @cached(100, "heroStats")
  async heroStats(
    version: Dota2Version,
    steam_id: string,
  ): Promise<HeroStatsDto[]> {
    return await this.playerInMatchRepository.query(
      `
select pim."playerId",
       avg(pim.gpm)::float                                             as gpm,
       avg(pim.xpm)::float                                              as xpm,
       avg((pim.kills + pim.assists)::float / greatest(pim.deaths, 1))::float  as kda,
       count(*)::int as games,
       avg(pim.last_hits)::float as last_hits,
       avg(pim.denies)::float as denies,
       sum((pim.team = match.winner)::int)::int as wins,
       sum((pim.team != match.winner)::int)::int as loss,
       pim.hero
from player_in_match pim
inner join finished_match match on "matchId" = match.id
where pim."playerId" = $3 and match.matchmaking_mode in ($1, $2)
group by pim.hero, pim."playerId"
`,
      [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED, steam_id],
    );
  }

  @cached(100, "winrateLastRankedGames")
  async winrateLastRankedGames(steam_id: string): Promise<number> {
    const some: { is_win: boolean }[] = await this.playerInMatchRepository
      .query(`
    select m.winner = pims.team as is_win
from finished_match m inner join player_in_match pims on m.id = pims."matchId"
where pims."playerId" = '${steam_id}' and m.matchmaking_mode = ${MatchmakingMode.RANKED}
order by m.timestamp DESC
LIMIT 20;
`);

    const winCount = some.reduce((a, b) => a + (b.is_win ? 1 : 0), 0);

    const recordCount = some.length;

    return winCount / recordCount;
  }

  async getHeroPlayers(hero: string): Promise<PlayerHeroPerformance[]> {
    const query = `
with players as (select pim."playerId"                  as player,
                        sum((pim.team = m.winner)::int) as wins,
                        avg(pim.level)                  as level,
                        avg(pim.kills)                  as kills,
                        avg(pim.deaths)                 as deaths,
                        avg(pim.assists)                as assists,
                        sum(1)                          as games
                 from player_in_match pim
                          inner join finished_match m on m.id = pim."matchId"
                 where pim.hero = $1
                   and (pim."playerId"::int > 10)
                   and m.matchmaking_mode in ($2, $3)
                 group by pim."playerId")
select p.player as steam_id,
       p.games::int                                                               as games,
       p.wins::int                                                                as wins,
       p.kills::float                                                             as kills,
       p.deaths::float                                                            as deaths,
       p.assists::float                                                           as assists,
       (((p.kills + p.assists) / greatest(1, p.deaths)) * p.level * ((p.wins::float / p.games) ^ 2 * p.games))::int as score
from players p
where p.games > $4
order by score desc`;

    const minGames = 8;
    return await this.connection.query<PlayerHeroPerformance[]>(query, [
      hero,
      MatchmakingMode.UNRANKED,
      MatchmakingMode.RANKED,
      minGames,
    ]);
  }

  async fullSummary(steam_id: string): Promise<Summary> {
    const some = await this.playerInMatchRepository.query(
      `with cte as (select plr."playerId"                                                                   as steam_id,
                    count(*)::int                                                                    as any_games,
                    sum((m.winner = plr.team )::int)::int                                            as bot_wins,
                    sum((m.matchmaking_mode in (0, 1))::int)::int                                    as games,
                    sum((m.winner = plr.team and m.matchmaking_mode in (0, 1))::int)::int            as wins,
                    sum((m.matchmaking_mode = 0 and m.timestamp > now() - '14 days'::interval)::int) as recent_ranked_games,
                    coalesce(p.hidden_mmr, -1)                                                       as mmr
             from player_in_match plr
                      left join version_player p on plr."playerId" = p.steam_id
                      inner join finished_match m on plr."matchId" = m.id
where plr."playerId" = $1
             group by plr."playerId", p.hidden_mmr)
select p.steam_id,
       p.wins,
       p.games,
       p.any_games,
       p.bot_wins,
       p.mmr                                                                        as mmr,
       avg(pim.kills)::float                                                        as kills,
       avg(pim.deaths)::float                                                       as deaths,
       avg(pim.assists)::float                                                      as assists,
       sum(m.duration)::int                                                         as play_time,
       sum((m.matchmaking_mode in ($2, $3))::int)                                   as ranked_games,
       -1                             as rank
from cte p
         inner join player_in_match pim on pim."playerId" = p.steam_id
         inner join finished_match m on pim."matchId" = m.id
group by p.steam_id, p.recent_ranked_games, p.mmr, p.games, p.wins, p.any_games, p.bot_wins`,
      [steam_id, MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
    );

    return some[0];
  }
}
