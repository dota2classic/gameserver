import { Injectable } from '@nestjs/common';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { LeaderboardEntryDto, PlayerSummaryDto } from 'rest/dto/player.dto';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';

interface CalcPlayerStats {
  steam_id: string;
  mmr: number;

  games: number;
  season_games: number;

  wins: number;

  kills: number;
  deaths: number;
  assists: number;
  play_time: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
    private readonly playerService: PlayerServiceV2,
  ) {}

  public async getPlayerSummary(steamId: string): Promise<PlayerSummaryDto> {
    const entry = await this.getPlayerLeaderboardEntry(steamId);
    const matchAccessLevel =
      await this.playerService.getMatchAccessLevel(steamId);
    return {
      ...entry,
      accessLevel: matchAccessLevel,
      calibrationGamesLeft: Math.max(
        ProcessRankedMatchHandler.TOTAL_CALIBRATION_GAMES - entry.games,
        0,
      ),
    };
  }

  private async getPlayerLeaderboardEntry(
    steamId: string,
  ): Promise<LeaderboardEntryDto> {
    const lb = await this.leaderboardViewRepository.findOne({
      where: { steamId },
    });

    // if it exists in the view, we happy
    if (!lb) {
      return this.approximatePlayerLeaderboardEntry(steamId);
    }

    return {
      rank: lb.rank,

      steamId: lb.steamId,
      mmr: lb.mmr,

      games: lb.games,
      seasonGames: lb.seasonGames,
      wins: lb.wins,

      kills: lb.kills,
      deaths: lb.deaths,
      assists: lb.assists,

      playtime: lb.playtime,
    };
  }

  private async approximatePlayerLeaderboardEntry(
    steamId: string,
  ): Promise<LeaderboardEntryDto> {
    const stats: CalcPlayerStats =
      await this.playerInMatchEntityRepository.query(
        `
with current_season as (
select
    *
from
    game_season gs
order by
    gs.start_timestamp desc
limit 1)
    select
    pim."playerId" as steam_id,
    vp.mmr,
    count(1)::int as games,
    (count(1) filter (
where
    fm.timestamp >= cs.start_timestamp))::int as season_games,
    (count(1) filter(
where
    pim.team = fm.winner))::int as wins,
    avg(pim.kills)::float as kills,
    avg(pim.deaths)::float as deaths,
    avg(pim.assists)::float as assists,
    sum(fm.duration)::int as play_time
from
    player_in_match pim
inner join finished_match fm on
    pim."matchId" = fm.id
inner join current_season cs on
    true
left join version_player vp on
    vp.steam_id = pim."playerId"
    and vp.season_id = cs.id
where
    pim."playerId" = $1
group by
    pim."playerId",
    vp.mmr`,
        [steamId],
      );

    return {
      rank: -1,

      steamId: stats.steam_id,
      mmr: stats.mmr,

      games: stats.games,
      seasonGames: stats.season_games,
      wins: stats.wins,

      kills: stats.kills,
      deaths: stats.deaths,
      assists: stats.assists,

      playtime: stats.play_time,
    };
  }
}
