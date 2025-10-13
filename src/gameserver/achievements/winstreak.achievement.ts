import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { Achievement } from 'gameserver/decorator/achievement';

@Achievement()
export class WinstreakAchievement extends BaseAchievement {
  key: AchievementKey = AchievementKey.WINSTREAK_10;
  checkpoints: number[] = [3, 5, 10, 15, 20];

  async progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<Progress> {
    const result: {
      steam_id: string;
      longest_winstreak: number;
      last_match_id: number;
    }[] = await this.playerInMatchEntityRepository.query(
      `
    WITH matches AS (
  SELECT
    pim."playerId" AS steam_id,
    fm.id AS match_id,
    fm.timestamp,
    CASE WHEN pim.team = fm.winner THEN 1 ELSE 0 END AS is_win
  FROM player_in_match pim
  JOIN finished_match fm ON fm.id = pim."matchId"
  WHERE fm.matchmaking_mode IN (0, 1) and pim."playerId" = $1
),
streaks AS (
  SELECT
    steam_id,
    match_id,
    timestamp,
    is_win,
    SUM(CASE WHEN is_win = 0 THEN 1 ELSE 0 END) OVER (
      PARTITION BY steam_id
      ORDER BY timestamp
      ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS grp
  FROM matches
),
streak_groups AS (
  SELECT
    steam_id,
    grp,
    COUNT(*) AS streak_len,
    MAX(match_id) AS last_match_id,  -- streak ends here
    MAX(timestamp) AS last_timestamp
  FROM streaks
  WHERE is_win = 1
  GROUP BY steam_id, grp
),
longest AS (
  SELECT
    steam_id,
    MAX(streak_len) AS longest_winstreak
  FROM streak_groups
  GROUP BY steam_id
)
SELECT
  l.steam_id,
  l.longest_winstreak,
  sg.last_match_id,
  sg.last_timestamp
FROM longest l
JOIN streak_groups sg
  ON sg.steam_id = l.steam_id
 AND sg.streak_len = l.longest_winstreak
ORDER BY l.longest_winstreak DESC;
    `,
      [pim.playerId],
    );

    return result.length
      ? {
          progress: result[0].longest_winstreak,
          matchId: result[0].last_match_id,
        }
      : 0;
  }
}
