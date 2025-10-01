import { BaseAchievement } from 'gameserver/achievements/base.achievement';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

export class WinHourTechiesAchievement extends BaseAchievement{
  checkpoints = [1]
  key = AchievementKey.WIN_1HR_GAME_AGAINST_TECHIES;

  async progress(pim: PlayerInMatchEntity, match: FinishedMatchEntity): Promise<number> {
    return this.playerInMatchEntityRepository
      .createQueryBuilder("pim")
      .innerJoin("pim.match", "fm")
      .where("pim.team = fm.winner") // player won
      .andWhere("fm.matchmaking_mode in (:...modes)", {
        modes: BaseAchievement.REAL_LOBBY_TYPES,
      })
      .andWhere("pim.playerId = :pid", { pid: pim.playerId })
      .andWhere("fm.duration >= :duration", { duration: 3600 })
      // Check that enemy team has a player with hero 'techies'
      .andWhere(qb => {
        const subQuery = qb
          .subQuery()
          .select("1")
          .from("player_in_match", "enemy")
          .where("enemy.matchId = fm.id")
          .andWhere("enemy.team != pim.team")
          .andWhere("enemy.hero = :techiesHero", {
            techiesHero: "npc_dota_hero_techies"
          })
          .getQuery();
        return `EXISTS ${subQuery}`;
      })
      .getCount();

  }

}
