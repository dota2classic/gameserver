import { BaseAchievement } from 'gameserver/achievements/base.achievement';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { Achievement } from 'gameserver/decorator/achievement';

@Achievement()
export class WinstreakAchievement extends BaseAchievement {
  key: AchievementKey = AchievementKey.WINSTREAK_10;
  checkpoints: number[] = [5, 10, 15, 20, 25, 30];

  async progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<number> {
    const raw: { win: boolean }[] =
      await this.playerInMatchEntityRepository.query(
        `select pim.team = f.winner as win, pim."playerId", f.id as matchId, pim.hero
from player_in_match pim
         inner join finished_match f on f.id = pim."matchId" and f.matchmaking_mode in (0, 1)
where pim."playerId" = $1
  and f.timestamp < $2
order by timestamp desc
limit $3`,
        [
          pim.playerId,
          match.timestamp,
          this.checkpoints[this.checkpoints.length - 1] + 1,
        ],
      );

    if (pim.team !== match.winner) return 0;

    let streak = 1;
    for (let rawElement of raw) {
      if (!rawElement.win) break;
      streak += 1;
    }

    return streak;
  }
}
