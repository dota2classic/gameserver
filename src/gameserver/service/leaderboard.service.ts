import { Injectable } from '@nestjs/common';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { LeaderboardEntryDto, PlayerSummaryDto } from 'rest/dto/player.dto';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';

interface CalcPlayerStats {
  steam_id: string;
  season_id: number;

  mmr: number;
  games: number;
  abandons: number;

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

  public async getPlayerSummary(steamId: string): Promise<Omit<PlayerSummaryDto, "reports">> {
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
      seasonId: lb.seasonId,
      mmr: lb.mmr,

      games: lb.games,
      wins: lb.wins,
      abandons: lb.abandons,

      kills: lb.kills,
      deaths: lb.deaths,
      assists: lb.assists,

      playtime: lb.playtime,
    };
  }

  private async approximatePlayerLeaderboardEntry(
    steamId: string,
  ): Promise<LeaderboardEntryDto> {
    const stats: CalcPlayerStats = await this.playerInMatchEntityRepository
      .query(
        `with current_season as (
select
    *
from
    game_season gs
order by
    gs.start_timestamp desc
limit 1)
select
    vp.steam_id,
    vp.season_id as season_id,
    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,
    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,
    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,
    vp.mmr as mmr,
    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,
    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,
    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,
    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,
    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank
from
    version_player vp
inner join  current_season gs on gs.id = vp.season_id
inner join
    player_in_match pim on pim."playerId" = vp.steam_id
inner join 
    finished_match fm on pim."matchId" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id
where vp.steam_id = $1
group by
    vp.steam_id,
    vp.season_id,
    vp.mmr
order by
    rank asc,
    games desc;
`,
        [steamId],
      )
      .then((it) => it[0]);

    return {
      rank: -1,

      steamId: steamId,
      mmr: stats?.mmr || VersionPlayerEntity.STARTING_MMR,
      seasonId: stats?.season_id || 1,

      games: stats?.games || 0,
      wins: stats?.wins || 0,
      abandons: stats?.abandons || 0,

      kills: stats?.kills || 0,
      deaths: stats?.deaths || 0,
      assists: stats?.assists || 0,

      playtime: stats?.play_time || 0,
    };
  }
}
