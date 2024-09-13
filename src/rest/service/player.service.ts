import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { Connection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import { HeroStatsDto, PlayerGeneralStatsDto, PlayerHeroPerformance } from 'rest/dto/hero.dto';
import { cached } from 'util/method-cache';
import { PlayerSummaryDto } from 'rest/dto/player.dto';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';

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

  @cached(100, 'getRank')
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

    const rank2 = await this.connection.query<{ count: number; pgames: number }[]>(`
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
    `, [MatchmakingMode.RANKED, steam_id, p.mmr])

    if(rank2.length === 0) return -1;
    if(rank2[0].pgames === 0) return -1;


    return rank2[0].count + 1;
  }

  @cached(100, 'gamesPlayed')
  public async gamesPlayed(
    steam_id: string,
    mode?: MatchmakingMode,
  ): Promise<number> {
    if (mode === undefined) {
      return this.playerInMatchRepository.count({
        where: { playerId: steam_id },
      });
    }

    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where('m.matchmaking_mode = :mode', { mode })
      .andWhere('pim.playerId = :steam_id', { steam_id })
      .getCount();
  }

  @cached(100, 'winrate')
  async winrate(steam_id: string, mode: MatchmakingMode) {
    const wins = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join finished_match m on pim."matchId" = m.id
where m.matchmaking_mode = ${mode} and pim."playerId" = '${steam_id}' and m.radiant_win = case pim.team when 2 then true else false end`)
    )[0].wins;

    const loss = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join finished_match m on pim."matchId" = m.id
where m.matchmaking_mode = ${mode} and pim."playerId" = '${steam_id}' and m.radiant_win != case pim.team when 2 then true else false end`)
    )[0].wins;

    return parseInt(wins) / Math.max(1, parseInt(wins) + parseInt(loss));
  }

  @cached(100, 'heroStats')
  async heroStats(
    version: Dota2Version,
    steam_id: string,
  ): Promise<HeroStatsDto[]> {
    return await this.playerInMatchRepository.query(`
select pim."playerId",
       CAST(avg(pim.gpm) as FLOAT)                                             as gpm,
       CAST(avg(pim.xpm) as FLOAT)                                             as xpm,
       avg(cast((pim.kills + pim.assists) as FLOAT) / greatest(pim.deaths, 1)) as kda,
       CAST(count(*) as INT) as games,
       avg(pim.last_hits) as last_hits,
       avg(pim.denies) as denies,
       CAST(sum((pim.team = match.winner)::int) as INT) as wins,
       CAST(sum((pim.team != match.winner)::int) as INT) as loss,
       pim.hero
from player_in_match pim
inner join finished_match match on "matchId" = match.id
where pim."playerId" = '${steam_id}' and (match.matchmaking_mode = ${MatchmakingMode.RANKED} or match.matchmaking_mode = ${MatchmakingMode.UNRANKED})
group by pim.hero, pim."playerId"
`);
  }

  @cached(100, 'winrateLastRankedGames')
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

  @cached(100, 'kdaLastRankedGames')
  async kdaLastRankedGames(steam_id: string): Promise<number> {
    console.log('Count latest KDA');
    const some = await this.playerInMatchRepository.find({
      where: {
        playerId: steam_id,
      },
      order: {
        id: 'DESC',
      },
      take: 20,
    });

    const KDA =
      some
        .map(it => (it.kills + it.assists) / Math.max(1, it.deaths))
        .reduce((a, b) => a + b, 0) / Math.max(1, some.length);

    console.log('CAlculated latest kda for ', steam_id, "it's ");
    return KDA;
    // const winCount = some.reduce((a, b) => a + (b.is_win ? 1 : 0), 0);
    //
    // const recordCount = some.length;
    //
    // return winCount / recordCount;
  }

  @cached(100, 'generalStats')
  async generalStats(steam_id: string): Promise<PlayerGeneralStatsDto> {
    const totalGames = await this.playerInMatchRepository.count({
      where: {
        playerId: steam_id,
      },
    });

    const wins = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join finished_match m on pim."matchId" = m.id
where (m.matchmaking_mode = ${MatchmakingMode.RANKED} or m.matchmaking_mode = ${MatchmakingMode.UNRANKED}) and pim."playerId" = '${steam_id}' and m.winner = pim.team`)
    )[0].wins;

    const loss = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join finished_match m on pim."matchId" = m.id
where (m.matchmaking_mode = ${MatchmakingMode.RANKED} or m.matchmaking_mode = ${MatchmakingMode.UNRANKED}) and pim."playerId" = '${steam_id}' and m.winner != pim.team`)
    )[0].wins;

    return {
      steam_id: steam_id,
      games_played: parseInt(wins) + parseInt(loss),
      games_played_all: totalGames,
      wins: parseInt(wins),
      loss: parseInt(loss),
    };
  }

  async getNonRankedGamesPlayed(steam_id: string): Promise<number> {
    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where('pim.playerId = :steam_id', { steam_id })
      .andWhere(
        '(m.matchmaking_mode = :mode or m.matchmaking_mode = :mode2 or m.matchmaking_mode = :mode3 or m.matchmaking_mode = :mode4)',
        {
          mode: MatchmakingMode.UNRANKED,
          mode2: MatchmakingMode.BOTS,
          mode3: MatchmakingMode.DIRETIDE,
          mode4: MatchmakingMode.SOLOMID,
        },
      )
      .getCount();
  }

  async getHeroPlayers(hero: string): Promise<PlayerHeroPerformance[]> {
    const query = `with players as (select pim."playerId"                  as player,
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
       ((p.kills + p.assists) / greatest(1, p.deaths))::float                     as kda,
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

  async fullSummary(
    steam_id: string,
  ): Promise<
    Omit<PlayerSummaryDto, 'rank' | 'newbieUnrankedGamesLeft'> & {
      ranked_games: number;
      unranked_games: number;
    }
  > {
    const query = `
select pim."playerId"                                                 as steam_id,
       vp.mmr::int                                                    as mmr,
       count(pim)::int                                                as games_played,
       sum((pim.team = m.winner)::int)::int                           as wins,
       sum((pim.team != m.winner)::int)::int                          as loss,
       sum((m.matchmaking_mode = $1)::int)::int                       as ranked_games,
       sum((m.matchmaking_mode = $2)::int)::int                       as unranked_games
from player_in_match pim
         inner join version_player vp on vp.steam_id = pim."playerId"
         inner join finished_match m on m.id = pim."matchId"
where m.matchmaking_mode in (0, 1) and  pim."playerId" = $3
group by pim."playerId", mmr;`;

    return this.connection.query(query, [
      MatchmakingMode.RANKED,
      MatchmakingMode.UNRANKED,
      steam_id,
    ]).then(it => it[0]);
  }
}
