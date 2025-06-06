import { Injectable } from '@nestjs/common';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchAccessLevel } from 'gateway/shared-types/match-access-level';
import { RecalibrationEntity } from 'gameserver/model/recalibration.entity';
import { GameSeasonService } from 'gameserver/service/game-season.service';

function getMatchAccessLevel(anyGames: number, anyWins: number) {
  if (anyWins) return MatchAccessLevel.HUMAN_GAMES;
  if (anyGames) return MatchAccessLevel.SIMPLE_MODES;
  return MatchAccessLevel.EDUCATION;
}

@Injectable()
export class PlayerServiceV2 {
  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(RecalibrationEntity)
    private readonly recalibrationEntityRepository: Repository<RecalibrationEntity>,
    private readonly gameSeasonService: GameSeasonService,
  ) {}

  public async getCalibrationGame(
    season: GameSeasonEntity,
    steamId: string,
    modes: MatchmakingMode[] | undefined,
    beforeTimestamp: string,
  ) {
    let q = this.playerInMatchRepository
      .createQueryBuilder("pim")
      .innerJoin("pim.match", "m")
      .where("pim.playerId = :id", { id: steamId })
      .leftJoin(
        RecalibrationEntity,
        "recalibration",
        "recalibration.season_id = :season and recalibration.steam_id = :steamId",
        {
          season: season.id,
          steamId,
        },
      )
      .andWhere(
        "m.timestamp > GREATEST(:seasonStart, recalibration.created_at)",
        { seasonStart: season.startTimestamp },
      )
      .andWhere("m.timestamp < :current_timestamp", {
        current_timestamp: beforeTimestamp,
      });

    if (modes != undefined)
      q = q.andWhere("m.matchmaking_mode in (:...modes)", { modes });

    return q.getCount();
  }

  public async getMatchAccessLevel(steamId: string): Promise<MatchAccessLevel> {
    const result: { any_wins: number; any_games: number }[] =
      await this.playerInMatchRepository.query(
        `
select (count(*) filter(where pa.win))::int as any_wins, count(pa)::int as any_games
from player_activity pa
where pa.steam_id = $1
`,
        [steamId],
      );

    return getMatchAccessLevel(result[0].any_games, result[0].any_wins);
  }

  async startRecalibration(steamId: string) {
    const currentSeason = await this.gameSeasonService.getCurrentSeason();
    await this.recalibrationEntityRepository.save({
      steamId,
      seasonId: currentSeason.id,
    });
  }

  public async getRecalibration(steamId: string) {
    return this.recalibrationEntityRepository
      .createQueryBuilder("rc")
      .addCommonTableExpression(
        `
select
    *
from
    game_season gs
order by
    gs.start_timestamp DESC
limit 1`,
        "current_season",
      )
      .innerJoin("current_season", "cs", "cs.id = rc.season_id")
      .where("rc.steam_id = :steamId", { steamId })
      .getOne();
  }
}
