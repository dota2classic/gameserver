import { Injectable } from '@nestjs/common';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { LeaderboardEntryDto, PlayerSummaryDto } from 'rest/dto/player.dto';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerServiceV2 } from 'gameserver/service/player-service-v2.service';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { sum } from 'util/avg';

interface CalcPlayerStats {
  steam_id: string;
  season_id: number;

  mmr: number;
  games: number;
  calibration_games: number;
  recalibration_attempted: boolean;
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
    private readonly gameSeasonService: GameSeasonService,
    private readonly playerService: PlayerServiceV2,
  ) {}

  public async getPlayerSummary(
    steamId: string,
  ): Promise<Omit<PlayerSummaryDto, "reports">> {
    const [season, overall, matchAccessLevel] = await Promise.combine([
      this.getPlayerLeaderboardEntry(steamId),
      this.getPlayerLeaderboardEntryOverall(steamId),
      this.playerService.getMatchAccessLevel(steamId),
    ]);

    return {
      steamId,
      season,
      overall,
      accessLevel: matchAccessLevel,
      calibrationGamesLeft: Math.max(
        ProcessRankedMatchHandler.TOTAL_CALIBRATION_GAMES - season.calibrationGames,
        0,
      ),
    };
  }

  private async getPlayerLeaderboardEntryOverall(steamId: string): Promise<LeaderboardEntryDto> {
    const lb = await this.leaderboardViewRepository.find({
      where: { steamId },
    });

    if (!lb) {
      return this.approximatePlayerLeaderboardEntry(steamId, false);
    }

    return {
      rank: -1,

      steamId: steamId,
      seasonId: -1,
      mmr: -1,

      games: sum(lb.map((it) => it.games)),
      wins: sum(lb.map((it) => it.wins)),
      abandons: sum(lb.map((it) => it.abandons)),

      kills: sum(lb.map((it) => it.kills)),
      deaths: sum(lb.map((it) => it.deaths)),
      assists: sum(lb.map((it) => it.assists)),
      recalibrationAttempted: false,

      playtime: sum(lb.map((it) => it.playtime)),
    };
  }

  private async getPlayerLeaderboardEntry(
    steamId: string,
  ): Promise<LeaderboardEntryDto & { calibrationGames: number; }> {
    const season = await this.gameSeasonService.getCurrentSeason();
    const lb = await this.leaderboardViewRepository.findOne({
      where: { steamId, seasonId: season.id },
    });

    // if it exists in the view, we happy
    if (!lb) {
      return this.approximatePlayerLeaderboardEntry(steamId, true);
    }

    return {
      rank: lb.rank,

      steamId: lb.steamId,
      seasonId: lb.seasonId,
      mmr: lb.mmr,
      recalibrationAttempted: lb.recalibrationAttempted,

      games: lb.games,
      calibrationGames: lb.calibrationGames,
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
    seasonal: boolean = true,
  ): Promise<LeaderboardEntryDto & { calibrationGames: number; recalibrationAttempted: boolean; }> {
    const stats: CalcPlayerStats = await this.playerInMatchEntityRepository
      .query(
        `with current_season as (
select
    *
from
    game_season gs
order by
    gs.start_timestamp ${seasonal ? "DESC" : "ASC"}
limit 1)
select
    vp.steam_id,
    vp.season_id as season_id,
    sum(count(1) filter (where fm.timestamp >= GREATEST(gs.start_timestamp, rc.created_at))) over (partition by vp.steam_id, vp.season_id) as calibration_games,
    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,
    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,
    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,
    vp.mmr as mmr,
    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,
    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,
    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,
    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,
    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank,
    count(rc) > 0 as recalibration_attempted
from
    version_player vp
inner join  current_season gs on gs.id = vp.season_id
inner join
    player_in_match pim on pim."playerId" = vp.steam_id
left join recalibration rc on rc.steam_id = vp.steam_id and rc.season_id = vp.season_id
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
      calibrationGames: stats?.calibration_games || 0,
      wins: stats?.wins || 0,
      abandons: stats?.abandons || 0,

      kills: stats?.kills || 0,
      deaths: stats?.deaths || 0,
      assists: stats?.assists || 0,
      recalibrationAttempted: stats?.recalibration_attempted || false,

      playtime: stats?.play_time || 0,
    };
  }
}
