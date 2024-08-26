import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { HeroStatsDto, PlayerGeneralStatsDto } from 'rest/dto/hero.dto';
import { cached } from 'util/method-cache';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    private readonly gsService: GameServerService,
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

    const rank = await this.versionPlayerRepository.query(`
        with players as (select p.steam_id, p.mmr, count(pim) as games
                 from version_player p
                          left outer join player_in_match pim
                          inner join match m on pim."matchId" = m.id
                                     on p.steam_id = pim."playerId" and
                                        m.type = ${MatchmakingMode.RANKED}
                 group by p.steam_id, p.mmr)
        select count(*)
        from players p
        where p.mmr > ${p.mmr}
        and p.games > 0
`);

    return parseInt(rank[0].count);
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
      .where('m.type = :mode', { mode })
      .andWhere('pim.playerId = :steam_id', { steam_id })
      .getCount();
  }

  @cached(100, 'winrate')
  async winrate(steam_id: string, mode: MatchmakingMode) {
    const wins = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join match m on pim."matchId" = m.id
where m.type = ${mode} and pim."playerId" = '${steam_id}' and m.radiant_win = case pim.team when 2 then true else false end`)
    )[0].wins;

    const loss = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join match m on pim."matchId" = m.id
where m.type = ${mode} and pim."playerId" = '${steam_id}' and m.radiant_win != case pim.team when 2 then true else false end`)
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
       sum(case (pim.team = (case match.radiant_win when true then 2 else 3 end)) when true then 1 else 0 end) as wins,
       sum(case (pim.team = (case match.radiant_win when true then 2 else 3 end)) when true then 0 else 1 end) as loss,
       pim.hero
from player_in_match pim
inner join match on "matchId" = match.id
where pim."playerId" = '${steam_id}' and (match.type = ${MatchmakingMode.RANKED} or match.type = ${MatchmakingMode.UNRANKED})
group by pim.hero, pim."playerId"
`);
  }

  @cached(100, 'winrateLastRankedGames')
  async winrateLastRankedGames(steam_id: string): Promise<number> {
    const some: { is_win: boolean }[] = await this.playerInMatchRepository
      .query(`
    select (case when m.radiant_win then 2 else 3 end) = pims.team as is_win
from match m inner join player_in_match pims on m.id = pims."matchId"
where pims."playerId" = '${steam_id}' and m.type = ${MatchmakingMode.RANKED}
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
         inner join match m on pim."matchId" = m.id
where m.type = ${MatchmakingMode.RANKED} and pim."playerId" = '${steam_id}' and m.radiant_win = case pim.team when 2 then true else false end`)
    )[0].wins;

    const loss = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join match m on pim."matchId" = m.id
where m.type = ${MatchmakingMode.RANKED} and pim."playerId" = '${steam_id}' and m.radiant_win != case pim.team when 2 then true else false end`)
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
        '(m.type = :mode or m.type = :mode2 or m.type = :mode3 or m.type = :mode4)',
        {
          mode: MatchmakingMode.UNRANKED,
          mode2: MatchmakingMode.BOTS,
          mode3: MatchmakingMode.DIRETIDE,
          mode4: MatchmakingMode.SOLOMID,
        },
      )
      .getCount();
  }
}
