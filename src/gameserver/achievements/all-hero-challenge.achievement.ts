import { BaseAchievement } from 'gameserver/achievements/base.achievement';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class AllHeroChallengeAchievement extends BaseAchievement {
  key: AchievementKey = AchievementKey.ALL_HERO_CHALLENGE;
  checkpoints: [110];

  supportsLobbyType(type: MatchmakingMode): boolean {
    return BaseAchievement.REAL_LOBBY_TYPES.includes(type);
  }

  async progress(
    pim: PlayerInMatchEntity,
    match: FinishedMatchEntity,
  ): Promise<number> {
    const uniqueHeroes: {
      unique_heroes_played;
    }[] = await this.playerInMatchEntityRepository.query(
      `with wins as (select p."playerId",  p.hero
              from player_in_match p
                       inner join finished_match fm on fm.id = p."matchId" and fm.winner = p.team and fm.matchmaking_mode in (0, 1)
              where p."playerId" = $1
)
select count(distinct p.hero) as unique_heroes_played
from wins p`,
      [pim.playerId],
    );

    return uniqueHeroes.length > 0
      ? Number(uniqueHeroes[0].unique_heroes_played)
      : 0;
  }
}
