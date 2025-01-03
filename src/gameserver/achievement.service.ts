import { Injectable } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { AchievementProgress, BaseAchievement } from 'gameserver/achievements/base.achievement';
import { WinstreakAchievement } from 'gameserver/achievements/winstreak.achievement';
import { AllHeroChallengeAchievement } from 'gameserver/achievements/all-hero-challenge.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Injectable()
export class AchievementService {
  public readonly achievementMap: Map<AchievementKey, BaseAchievement>;

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
  ) {
    this.achievementMap = this.createAchievements(
      playerInMatchEntityRepository,
      finishedMatchEntityRepository,
    );
  }

  private createAchievements(
    p: Repository<PlayerInMatchEntity>,
    f: Repository<FinishedMatchEntity>,
  ) {
    const createRunningAchievement =
      (
        map: Map<AchievementKey, BaseAchievement>,
        p: Repository<PlayerInMatchEntity>,
        f: Repository<FinishedMatchEntity>,
      ) =>
      (
        key: AchievementKey,
        modes: MatchmakingMode[],
        maxProgress: number,
        progress: (pim: PlayerInMatchEntity, m: FinishedMatchEntity) => number,
      ) => {
        const c = new (class extends BaseAchievement {
          key = key;
          maxProgress = maxProgress;

          supportsLobbyType(type: MatchmakingMode): boolean {
            return modes.includes(type);
          }

          async getProgress(
            pim: PlayerInMatchEntity,
            match: FinishedMatchEntity,
          ): Promise<AchievementProgress> {
            const p = progress(pim, match);

            return {
              progress: p,
              matchId: match.id,
              hero: pim.hero,
            };
          }
        })(f, p);

        map.set(key, c);

        return c;
      };

    const map = new Map<AchievementKey, BaseAchievement>();
    const runningAchievement = createRunningAchievement(map, p, f);

    runningAchievement(
      AchievementKey.HARDCORE,
      BaseAchievement.REAL_LOBBY_TYPES,
      1,
      (t, m) => +(t.level === 25 && t.team === m.winner && t.deaths === 0),
    );
    runningAchievement(
      AchievementKey.GPM_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      1000,
      (t) => t.gpm,
    );

    runningAchievement(
      AchievementKey.XPM_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      1000,
      (t) => t.xpm,
    );
    runningAchievement(
      AchievementKey.LAST_HITS_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      1000,
      (t) => t.last_hits,
    );
    runningAchievement(
      AchievementKey.DENIES_50,
      BaseAchievement.REAL_LOBBY_TYPES,
      50,
      (t) => t.denies,
    );

    runningAchievement(
      AchievementKey.GPM_XPM_1000,
      BaseAchievement.REAL_LOBBY_TYPES,
      1,
      (t) => +(t.gpm >= 1000 && t.xpm >= 1000),
    );

    runningAchievement(
      AchievementKey.WIN_1HR_GAME,
      BaseAchievement.REAL_LOBBY_TYPES,
      1,
      (t, m) => +(t.team === m.winner && m.duration >= 3600),
    );

    runningAchievement(
      AchievementKey.WIN_BOT_GAME,
      [MatchmakingMode.BOTS],
      1,
      (t, m) => +(t.team === m.winner),
    );


    runningAchievement(
      AchievementKey.WIN_BOT_GAME,
      [MatchmakingMode.BOTS],
      1,
      (t, m) => +(t.team === m.winner),
    );

    runningAchievement(
      AchievementKey.WIN_SOLOMID_GAME,
      [MatchmakingMode.SOLOMID],
      1,
      (t, m) => +(t.team === m.winner),
    );

    runningAchievement(
      AchievementKey.WIN_1HR_GAME_AGAINST_TECHIES,
      BaseAchievement.REAL_LOBBY_TYPES,
      1,
      (t, m) =>
        +(
          t.team === m.winner &&
          m.duration >= 3600 &&
          m.players.findIndex(
            (en) => en.team != t.team && en.hero === "npc_dota_hero_techies",
          ) !== -1
        ),
    );

    map.set(AchievementKey.WINSTREAK_10, new WinstreakAchievement(f, p, 10));
    map.set(
      AchievementKey.ALL_HERO_CHALLENGE,
      new AllHeroChallengeAchievement(f, p),
    );

    return map;
  }

  getMaxProgressForKey(achievement_key: AchievementKey) {
    return this.achievementMap.get(achievement_key).maxProgress;
  }
}
