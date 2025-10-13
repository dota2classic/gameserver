import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

export class GlassCannonAchievement extends BaseAchievement {
  checkpoints = [1];
  key = AchievementKey.GLASSCANNON;


  async progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<Progress> {
    const query = this.playerInMatchEntityRepository
      .createQueryBuilder("pim")
      .select('pim."matchId"', "match_id")
      .addSelect('pim."playerId"', "player_id")
      .innerJoin("pim.match", "fm")
      .where("pim.playerId = :pid", { pid: pim.playerId })
      .andWhere("fm.matchmaking_mode in (:...modes)", {
        modes: BaseAchievement.REAL_LOBBY_TYPES,
      })
      .andWhere("pim.hero_damage > 0")
      .andWhere("pim.deaths > 0")
      .andWhere(
        `pim.deaths = (
      SELECT MAX(pim2.deaths)
      FROM player_in_match pim2
      WHERE pim2."matchId" = pim."matchId"
    )`,
      )
      .andWhere(
        `pim.hero_damage = (
      SELECT MAX(pim3.hero_damage)
      FROM player_in_match pim3
      WHERE pim3."matchId" = pim."matchId"
    )`,
      )
      .orderBy("fm.timestamp", "DESC");

    const result = await query.getRawMany<{ match_id: number }>();

    return result.length
      ? {
        progress: 1,
        matchId: result[0].match_id,
      }
      : 0;
  }
}
