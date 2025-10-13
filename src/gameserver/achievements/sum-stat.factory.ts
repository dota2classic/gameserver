import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';

export const SumStatFactory = (
  key: AchievementKey,
  checkpoints: number[],
  stat: keyof PlayerInMatchEntity,
) => {
  return class extends BaseAchievement {
    checkpoints = checkpoints;
    key = key;

    async progress(
      pim: PlayerInMatchEntity,
      match: FinishedMatchEntity,
    ): Promise<Progress> {
      const maxStat = await this.playerInMatchEntityRepository
        .createQueryBuilder("pim")
        .select(`SUM(pim."${stat}")`, "sum_stat")
        .innerJoin("pim.match", "fm")
        .where("fm.matchmaking_mode in (:...modes)", {
          modes: BaseAchievement.REAL_LOBBY_TYPES,
        })
        .andWhere("pim.playerId = :pid", { pid: pim.playerId })
        .limit(1)
        .getRawOne<{ sum_stat: number }>();

      return {
        progress: Number(maxStat.sum_stat),
        matchId: null,
      };
    }
  };
};
