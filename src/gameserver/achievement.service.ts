import { Injectable } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { BaseAchievement } from 'gameserver/achievements/base.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Injectable()
export class AchievementService {
  public readonly achievementMap: Map<AchievementKey, BaseAchievement> = new Map();

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
  ) {
    this.createAchievements();
  }

  private matchAchievement = (
    key: AchievementKey,
    modes: MatchmakingMode[],
    checkpoints: number[],
    progress: (pim: PlayerInMatchEntity, m: FinishedMatchEntity) => number,
  ) => {
    const c = new (class extends BaseAchievement {
      key = key;
      checkpoints = checkpoints;

      supportsLobbyType(type: MatchmakingMode): boolean {
        return modes.includes(type);
      }

      async progress(
        pim: PlayerInMatchEntity,
        match: FinishedMatchEntity,
      ): Promise<number> {
        return progress(pim, match);
      }
    })(this.finishedMatchEntityRepository, this.playerInMatchEntityRepository);

    this.achievementMap.set(key, c);

    return c;
  };

  private totalAchievement = (
    key: AchievementKey,
    modes: MatchmakingMode[],
    checkpoints: number[],
    progress: (
      pim: PlayerInMatchEntity,
      m: FinishedMatchEntity,
    ) => Promise<number> | number,
  ) => {
    const c = new (class extends BaseAchievement {
      key = key;
      checkpoints = checkpoints;

      supportsLobbyType(type: MatchmakingMode): boolean {
        return modes.includes(type);
      }

      async progress(
        pim: PlayerInMatchEntity,
        match: FinishedMatchEntity,
      ): Promise<number> {
        return progress(pim, match);
      }
    })(this.finishedMatchEntityRepository, this.playerInMatchEntityRepository);

    this.achievementMap.set(key, c);

    return c;
  };

  private createAchievements() {
    const map = new Map<AchievementKey, BaseAchievement>();

    this.matchAchievement(
      AchievementKey.HARDCORE,
      BaseAchievement.REAL_LOBBY_TYPES,
      [1],
      (t, m) => +(t.level === 25 && t.team === m.winner && t.deaths === 0),
    );

    this.matchAchievement(
      AchievementKey.GPM_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      [250, 500, 750, 1000, 1500],
      (t) => t.gpm,
    );

    this.matchAchievement(
      AchievementKey.XPM_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      [250, 500, 750, 1000, 1500],
      (t) => t.xpm,
    );

    this.matchAchievement(
      AchievementKey.LAST_HITS_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      [100, 250, 500, 750, 1000],
      (t) => t.last_hits,
    );

    this.matchAchievement(
      AchievementKey.DENIES_50,
      BaseAchievement.REAL_LOBBY_TYPES,
      [5, 10, 15, 25, 50],
      (t) => t.denies,
    );

    this.matchAchievement(
      AchievementKey.GPM_XPM_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      [1],
      (t) => +(t.gpm >= 1000 && t.xpm >= 1000),
    );

    this.totalAchievement(
      AchievementKey.WIN_1HR_GAME,
      BaseAchievement.REAL_LOBBY_TYPES,
      [1, 5, 10, 25, 50],
      async (t, m) => {
        return this.playerInMatchEntityRepository
          .createQueryBuilder("pim")
          .innerJoin("player.match", "fm")
          .where("player.team = fm.winner")
          .andWhere("fm.matchmaking_mode in (...:modes)", {
            modes: BaseAchievement.REAL_LOBBY_TYPES,
          })
          .andWhere("player.playerId = :pid", { pid: t.playerId })
          .andWhere("fm.duration >= :duration", { duration: 3600 })
          .printSql()
          .getCount();
      },
    );

    this.matchAchievement(
      AchievementKey.KILLS,
      BaseAchievement.REAL_LOBBY_TYPES,
      [1, 5, 10, 25, 50],
      (t) => t.kills,
    );
    //
    // this.matchAchievement(
    //   AchievementKey.WIN_1HR_GAME,
    //   BaseAchievement.REAL_LOBBY_TYPES,
    //   [1],
    //   (t, m) => +(t.team === m.winner && m.duration >= 3600),
    // );
    //
    // this.matchAchievement(
    //   AchievementKey.WIN_BOT_GAME,
    //   [MatchmakingMode.BOTS],
    //   [1],
    //   (t, m) => +(t.team === m.winner),
    // );
    //
    // runningAchievement(
    //   AchievementKey.WIN_BOT_GAME,
    //   [MatchmakingMode.BOTS],
    //   1,
    //   (t, m) => +(t.team === m.winner),
    // );
    //
    // runningAchievement(
    //   AchievementKey.WIN_SOLOMID_GAME,
    //   [MatchmakingMode.SOLOMID],
    //   1,
    //   (t, m) => +(t.team === m.winner),
    // );
    //
    // runningAchievement(
    //   AchievementKey.WIN_1HR_GAME_AGAINST_TECHIES,
    //   BaseAchievement.REAL_LOBBY_TYPES,
    //   1,
    //   (t, m) =>
    //     +(
    //       t.team === m.winner &&
    //       m.duration >= 3600 &&
    //       m.players.findIndex(
    //         (en) => en.team != t.team && en.hero === "npc_dota_hero_techies",
    //       ) !== -1
    //     ),
    // );

    return map;
  }
}
