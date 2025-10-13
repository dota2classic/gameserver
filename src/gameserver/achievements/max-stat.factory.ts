import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';

export const MaxStatFactory = (
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
        .select(`MAX(pim."${stat}")`, "max_stat")
        .addSelect('pim."matchId"', "match_id")
        .innerJoin("pim.match", "fm")
        .where("fm.matchmaking_mode in (:...modes)", {
          modes: BaseAchievement.REAL_LOBBY_TYPES,
        })
        .groupBy('pim."matchId"')
        .andWhere('pim."playerId" = :pid', { pid: pim.playerId })
        .orderBy("max_stat", "DESC")
        .limit(1)
        .getRawOne<{ max_stat: number; match_id: number }>();

      return {
        progress: Number(maxStat.max_stat),
        matchId: maxStat.match_id,
      };
    }
  };
};
