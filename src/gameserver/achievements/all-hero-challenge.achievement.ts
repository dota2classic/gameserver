import { AchievementKey, AchievementProgress, BaseAchievement } from 'gameserver/achievements/base.achievement';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

export class AllHeroChallengeAchievement extends BaseAchievement {
  key: AchievementKey = AchievementKey.ALL_HERO_CHALLENGE;
  maxProgress: number = 100;

  async getProgress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<AchievementProgress> {
    const uniqueHeroes: {
      unique_heroes_played;
    }[] = await this.playerInMatchEntityRepository.query(
      `with wins as (select p."playerId", p.hero, p.team = fm.winner as win
              from player_in_match p
                       inner join finished_match fm on fm.id = p."matchId"
              where p."playerId" = $1
)
select count(distinct p.hero) as unique_heroes_played
from wins p`,
      [pim.playerId],
    );

    const uhp =
      uniqueHeroes.length > 0
        ? Number(uniqueHeroes[0].unique_heroes_played)
        : 0;

    return {
      progress: uhp,
      matchId: match.id,
      hero: pim.hero,
    };
  }
}
