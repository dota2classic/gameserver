import { Injectable } from '@nestjs/common';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchAccessLevel } from 'gateway/shared-types/match-access-level';
import { RecalibrationEntity } from 'gameserver/model/recalibration.entity';
import { GameSeasonService } from 'gameserver/service/game-season.service';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';

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
    @InjectRepository(GameServerSessionEntity)
    private readonly sessionRepo: Repository<GameServerSessionEntity>,
    @InjectRepository(GameSessionPlayerEntity)
    private readonly sessionPlayerRepo: Repository<GameSessionPlayerEntity>,
    private readonly gameSeasonService: GameSeasonService,
    private readonly ds: DataSource,
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
select
  (count(*) filter(
where
  pim.team = fm.winner))::int as any_wins,
  count(pim)::int as any_games
from
  player_in_match pim
inner join finished_match fm on
  fm.id = pim."matchId"
where
  pim."playerId" = $1
`,
        [steamId],
      );

    return getMatchAccessLevel(result[0].any_games, result[0].any_wins);
  }

  async startRecalibration(steamId: string) {
    const currentSeason = await this.gameSeasonService.getCurrentSeason();
    await this.ds.transaction(async (tx) => {
      await tx.save(RecalibrationEntity, {
        steamId,
        seasonId: currentSeason.id,
      });

      await tx.save(VersionPlayerEntity, {
        steamId,
        seasonId: currentSeason.id,
        mmr: VersionPlayerEntity.STARTING_MMR,
      } satisfies Partial<VersionPlayerEntity>);
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

  public async getSession(steamId: string) {
    const sp = await this.sessionPlayerRepo
      .createQueryBuilder("gssp")
      .innerJoinAndMapOne(
        "gssp.session",
        GameServerSessionEntity,
        "gss",
        "gss.match_id = gssp.match_id",
      )

      .where("gssp.steam_id = :steamId", { steamId })
      .andWhere("gssp.abandoned = false")
      .andWhere("gss.game_state != :postGame", {
        postGame: Dota_GameRulesState.POST_GAME,
      })
      .getOne();

    return sp?.session;
  }
}
