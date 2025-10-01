import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

export class AllMeleeAchievement extends BaseAchievement {
  checkpoints = [1];
  key = AchievementKey.ALL_MELEE;

  async progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<Progress> {
    const p = await this.playerInMatchEntityRepository
      .createQueryBuilder("pim")
      .innerJoinAndSelect("pim.match", "fm")
      .where("pim.playerId = :pid", { pid: pim.playerId })
      .andWhere("fm.matchmaking_mode in (:...modes)", {
        modes: BaseAchievement.REAL_LOBBY_TYPES,
      })
      .andWhere((qb) => {
        const subQuery = qb
          .subQuery()
          .select("1")
          .from("player_in_match", "p2")
          .innerJoin("heroes", "h", "h.hero = p2.hero")
          .where("p2.matchId = fm.id")
          .andWhere("h.melee = false") // there is a ranged hero
          .getQuery();

        return `NOT EXISTS ${subQuery}`;
      })
      .orderBy("fm.id", "DESC") // or fm.started_at if you have a datetime
      .getOne();

    return p
      ? {
          progress: 1,
          matchId: p.matchId,
        }
      : 0;
  }
}
