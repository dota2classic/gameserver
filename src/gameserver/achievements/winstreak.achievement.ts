import { AchievementKey, AchievementProgress, BaseAchievement } from 'gameserver/achievements/base.achievement';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { Repository } from 'typeorm';

export class WinstreakAchievement extends BaseAchievement {
  key: AchievementKey = AchievementKey.WINSTREAK_10;
  maxProgress: number = 10;

  constructor(
    finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
    maxProgress: number,
  ) {
    super(finishedMatchEntityRepository, playerInMatchEntityRepository);
    this.maxProgress = maxProgress;
  }

  async getProgress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<AchievementProgress> {
    const raw: { win: boolean }[] = await this.playerInMatchEntityRepository
      .query(`select pim.team = f.winner as win, pim."playerId", f.id as matchId, pim.hero
from player_in_match pim
         inner join finished_match f on f.id = pim."matchId" and f.matchmaking_mode in (0, 1)
where pim."playerId" = $1
  and f.timestamp < $2
order by timestamp desc
limit 9`, [pim.playerId, match.timestamp]);

    if (pim.team !== match.winner)
      return {
        progress: 0,
        matchId: match.id,
        hero: pim.hero,
      };

    let streak = 1;
    for (let rawElement of raw) {
      if (!rawElement.win) break;
      streak += 1;
    }

    return {
      progress: streak,
      matchId: match.id,
      hero: pim.hero,
    };
  }
}
