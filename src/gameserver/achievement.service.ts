import { Injectable } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { BaseAchievement } from 'gameserver/achievements/base.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Constructor } from '@nestjs/cqrs';
import { WinstreakAchievement } from 'gameserver/achievements/winstreak.achievement';
import { AllHeroChallengeAchievement } from 'gameserver/achievements/all-hero-challenge.achievement';
import { WinHourTechiesAchievement } from 'gameserver/achievements/win-hour-techies.achievement';
import { MaxStatFactory } from 'gameserver/achievements/max-stat.factory';
import { SumStatFactory } from 'gameserver/achievements/sum-stat.factory';
import { WinHourGameAchievement } from 'gameserver/achievements/win-hour-game.achievement';
import { GlassCannonAchievement } from 'gameserver/achievements/glasscannon.achievement';
import { WinModeFactory } from 'gameserver/achievements/win-mode.factory';
import { AllMeleeAchievement } from 'gameserver/achievements/all-melee.achievement';
import { MeatGrinderAchievement } from 'gameserver/achievements/meatgrinder.achievement';

@Injectable()
export class AchievementService {
  public readonly achievementMap: Map<AchievementKey, BaseAchievement> =
    new Map();

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
  ) {
    this.createAchievements();
  }

  private custom = (type: Constructor<BaseAchievement>) => {
    const instance = new type(
      this.finishedMatchEntityRepository,
      this.playerInMatchEntityRepository,
    );
    this.achievementMap.set(instance.key, instance);
  };

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
    this.matchAchievement(
      AchievementKey.HARDCORE,
      BaseAchievement.REAL_LOBBY_TYPES,
      [1],
      (t, m) => +(t.level === 25 && t.team === m.winner && t.deaths === 0),
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

    this.custom(
      MaxStatFactory(
        AchievementKey.XPM_1000,
        [250, 500, 750, 1000, 1500],
        "xpm",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.MAX_KILLS,
        [5, 10, 15, 20, 30, 50],
        "kills",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.MAX_ASSISTS,
        [5, 10, 15, 20, 30, 50],
        "assists",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.GPM_1000,
        [250, 500, 750, 1000, 1500],
        "gpm",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.LAST_HITS_1000,
        [100, 250, 500, 750, 1000, 1500, 2000],
        "last_hits",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.TOWER_DAMAGE,
        [500, 1500, 2500, 5000, 10000, 15000],
        "tower_damage",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.HERO_HEALING,
        [500, 1500, 2500, 5000, 10000, 14000],
        "hero_healing",
      ),
    );

    this.custom(
      MaxStatFactory(
        AchievementKey.HERO_DAMAGE,
        [10_000, 25_000, 50_000, 100_000, 250_000],
        "hero_damage",
      ),
    );

    this.custom(
      MaxStatFactory(AchievementKey.MISSES, [10, 25, 50, 100, 150], "misses"),
    );

    this.custom(WinHourTechiesAchievement);
    this.custom(WinHourGameAchievement);

    this.custom(
      SumStatFactory(
        AchievementKey.KILLS,
        [5, 25, 1000, 5000, 50000, 100000, 500000],
        "kills",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.ASSISTS,
        [5, 100, 1000, 5000, 50000, 100000, 500000],
        "assists",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.LAST_HITS_SUM,
        [100, 1000, 10000, 100000, 500000, 1_000_000],
        "last_hits",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.DENY_SUM,
        [50, 100, 500, 1000, 10_000, 50_000],
        "denies",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.TOWER_DAMAGE_SUM,
        [2500, 10000, 50_000, 250_000, 1_000_000, 15_000_000],
        "tower_damage",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.HERO_HEALING_SUM,
        [2500, 10000, 50_000, 250_000, 500_000, 1_000_000],
        "hero_healing",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.HERO_DAMAGE_SUM,
        [25000, 100_000, 500_000, 5_000_000, 100_000_000],
        "hero_damage",
      ),
    );

    this.custom(
      SumStatFactory(
        AchievementKey.DEATH_SUM,
        [5, 100, 1000, 5000, 10_000, 25_000, 50_000],
        "deaths",
      ),
    );

    this.custom(
      WinModeFactory(AchievementKey.WIN_SOLOMID_GAME, MatchmakingMode.SOLOMID),
    );
    this.custom(
      WinModeFactory(AchievementKey.WIN_BOT_GAME, MatchmakingMode.BOTS),
    );
    this.custom(
      WinModeFactory(
        AchievementKey.WIN_UNRANKED_GAME,
        MatchmakingMode.UNRANKED,
      ),
    );

    this.custom(WinstreakAchievement);
    this.custom(AllHeroChallengeAchievement);

    this.custom(GlassCannonAchievement);
    this.custom(AllMeleeAchievement);

    this.custom(MeatGrinderAchievement);

    this.totalAchievement(
      AchievementKey.MEAT_GRINDER,
      BaseAchievement.REAL_LOBBY_TYPES,
      [1],
      (t) => {
        return this.finishedMatchEntityRepository
          .createQueryBuilder("fm")
          .innerJoin("fm.players", "pim") // relation: MatchEntity.players → PlayerInMatchEntity
          .where((qb) => {
            const subQuery = qb
              .subQuery()
              .select("pim2.matchId")
              .from(PlayerInMatchEntity, "pim2")
              .groupBy("pim2.matchId")
              .having("MIN(pim2.kills) >= :kills", { kills: 10 })
              .andHaving("MIN(pim2.deaths) >= :deaths", { deaths: 10 })
              .andHaving("MIN(pim2.assists) >= :assists", { assists: 10 })
              .getQuery();
            return "fm.id IN " + subQuery;
          })
          .andWhere((qb) => {
            const existsSub = qb
              .subQuery()
              .select("1")
              .from(PlayerInMatchEntity, "pim3")
              .where("pim3.matchId = fm.id")
              .andWhere("pim3.playerId = :pid", { pid: t.playerId })
              .getQuery();
            return "EXISTS " + existsSub;
          })
          .andWhere("fm.matchmaking_mode in (:...modes)", {
            modes: BaseAchievement.REAL_LOBBY_TYPES,
          })
          .printSql()
          .getCount();
      },
    );
  }
}
