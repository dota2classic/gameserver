import { Injectable } from "@nestjs/common";
import { GameSeasonEntity } from "gameserver/model/game-season.entity";
import { MatchmakingMode } from "gateway/shared-types/matchmaking-mode";
import { VersionPlayerEntity } from "gameserver/model/version-player.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { DataSource, Repository } from "typeorm";
import PlayerInMatchEntity from "gameserver/model/player-in-match.entity";
import { MatchAccessLevel } from "gateway/shared-types/match-access-level";
import { RecalibrationEntity } from "gameserver/model/recalibration.entity";
import { GameSeasonService } from "gameserver/service/game-season.service";
import { Dota_GameRulesState } from "gateway/shared-types/dota-game-rules-state";
import { GameServerSessionEntity } from "gameserver/model/game-server-session.entity";
import { GameSessionPlayerEntity } from "gameserver/model/game-session-player.entity";
import { StartingMmrService } from "gameserver/service/starting-mmr.service";
import { PlayerEducationLockEntity } from "gameserver/model/player-education-lock.entity";


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
    @InjectRepository(PlayerEducationLockEntity)
    private readonly educationLockRepo: Repository<PlayerEducationLockEntity>,
    private readonly gameSeasonService: GameSeasonService,
    private readonly ds: DataSource,
    private readonly startingMmr: StartingMmrService,
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

  public async getEducationStatus(
    steamId: string,
  ): Promise<{ accessLevel: MatchAccessLevel; readinessProgress: number }> {
    const lock = await this.educationLockRepo.findOne({ where: { steamId } });

    // No lock = existing player created before this feature — free access
    if (!lock || lock.resolved) {
      return { accessLevel: MatchAccessLevel.HUMAN_GAMES, readinessProgress: 1 };
    }

    const accessLevel =
      lock.totalBotGames === 0
        ? MatchAccessLevel.EDUCATION
        : MatchAccessLevel.SIMPLE_MODES;

    const readinessProgress =
      Math.min(lock.totalBotGames, lock.requiredGames) / lock.requiredGames;

    return { accessLevel, readinessProgress };
  }

  public async getMatchAccessLevel(steamId: string): Promise<MatchAccessLevel> {
    return (await this.getEducationStatus(steamId)).accessLevel;
  }

  public async getEducationLock(steamId: string): Promise<PlayerEducationLockEntity | null> {
    return this.educationLockRepo.findOne({ where: { steamId } });
  }

  public async patchEducationLock(steamId: string, requiredGames: number): Promise<PlayerEducationLockEntity> {
    await this.educationLockRepo.update({ steamId }, { requiredGames });
    return this.educationLockRepo.findOne({ where: { steamId } });
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
        mmr: await this.startingMmr.getStartingMMRForSteamId(steamId),
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

  public async getSession(
    steamId: string,
  ): Promise<GameSessionPlayerEntity | undefined> {
    return await this.sessionPlayerRepo
      .createQueryBuilder("gssp")
      .innerJoinAndMapOne(
        "gssp.session",
        GameServerSessionEntity,
        "gss",
        "gss.match_id = gssp.match_id",
      )
      .innerJoinAndMapMany(
        "gssp.session.players",
        GameSessionPlayerEntity,
        "gsps",
        "gsps.match_id = gss.match_id",
      )
      .where("gssp.steam_id = :steamId", { steamId })
      .andWhere("gssp.user_abandoned = false")
      .andWhere("gss.game_state != :postGame", {
        postGame: Dota_GameRulesState.POST_GAME,
      })
      .getOne();
  }

  async getStreak(
    season: GameSeasonEntity,
    steamId: string,
    modes: MatchmakingMode[] | undefined,
    beforeTimestamp: string,
  ): Promise<number> {
    const streak = await this.ds.query<
      { signed_streak: number; is_win: boolean; last_match_time: string }[]
    >(
      `WITH ordered_matches AS (
  SELECT
    p."matchId",
    p."playerId",
    f."timestamp",
    (p.team = f.winner) AS is_win
  FROM player_in_match p
  JOIN finished_match f ON f.id = p."matchId"
  WHERE p."playerId" = $1
    AND f."timestamp" < $2 AND f.matchmaking_mode in (0, 1, 8) AND f.timestamp > $3
), grouped_streaks AS (
  SELECT
    *,
    ROW_NUMBER() OVER (ORDER BY "timestamp") -
    ROW_NUMBER() OVER (PARTITION BY is_win ORDER BY "timestamp") AS streak_group
  FROM ordered_matches
), streaks AS (
  SELECT
    is_win,
    COUNT(*) AS streak_length,
    MAX("timestamp") AS last_match_time
  FROM grouped_streaks
  GROUP BY is_win, streak_group
), latest_streak AS (
  SELECT *
  FROM streaks
  ORDER BY last_match_time DESC
  LIMIT 1
)
SELECT
  CASE WHEN is_win THEN streak_length ELSE -streak_length END AS signed_streak,
  is_win,
  last_match_time
FROM latest_streak;`,
      [steamId, beforeTimestamp, season.startTimestamp],
    );

    return streak.length ? streak[0].signed_streak : 0;
  }
}
