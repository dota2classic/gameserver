import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

export class MeatGrinderAchievement extends BaseAchievement {
  checkpoints = [1];
  key = AchievementKey.MEAT_GRINDER;

  async progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<Progress> {
    const subQuery = this.playerInMatchEntityRepository
      .createQueryBuilder("pim2")
      .select("pim2.matchId", "matchId")
      .groupBy("pim2.matchId")
      .having("MIN(pim2.kills) >= :minKills", { minKills: 10 })
      .andHaving("MIN(pim2.deaths) >= :minDeaths", { minDeaths: 10 })
      .andHaving("MIN(pim2.assists) >= :minAssists", { minAssists: 10 });

    const qb = await this.finishedMatchEntityRepository
      .createQueryBuilder("fm")
      .select("fm")
      .innerJoin(
        "(" + subQuery.getQuery() + ")",
        "agg",
        'agg."matchId" = fm.id',
      )
      .innerJoin(
        "player_in_match",
        "pim3",
        "pim3.matchId = fm.id AND pim3.playerId = :playerId",
        {
          playerId: pim.playerId,
        },
      )
      .where("fm.matchmaking_mode IN (:...modes)", {
        modes: BaseAchievement.REAL_LOBBY_TYPES,
      })
      .orderBy("fm.timestamp", "ASC")
      .limit(1)
      .getOne();

    return qb
      ? {
          progress: 1,
          matchId: qb.id,
        }
      : 0;
  }
}
