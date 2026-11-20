import { AchievementService } from 'gameserver/achievement.service';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { DotaPatch } from 'gateway/constants/patch';
import { Region } from 'gateway/shared-types/region';

describe('MEAT_GRINDER achievement', () => {
  const meatGrinder = new AchievementService(undefined, undefined).achievementMap.get(
    AchievementKey.MEAT_GRINDER,
  );

  const finishedMatch = (lowestKills: number) => {
    const match = new FinishedMatchEntity(
      100,
      DotaTeam.RADIANT,
      new Date().toISOString(),
      Dota_GameMode.RANKED_AP,
      MatchmakingMode.RANKED,
      3600,
      '',
      1,
      DotaPatch.DOTA_684,
      Region.RU_MOSCOW,
    );
    match.players = Array.from({ length: 10 }, (_, i) =>
      Object.assign(new PlayerInMatchEntity(), {
        playerId: `${i}`,
        matchId: match.id,
        team: i < 5 ? DotaTeam.RADIANT : DotaTeam.DIRE,
        hero: 'npc_dota_hero_axe',
        kills: i === 0 ? lowestKills : 15,
        deaths: 10,
        assists: 12,
      }),
    );
    return match;
  };

  const noProgress = () =>
    Object.assign(new AchievementEntity(), {
      steam_id: '0',
      achievement_key: AchievementKey.MEAT_GRINDER,
      progress: 0,
    });

  it('completes on the finished match when every player has 10+ kills, deaths and assists', async () => {
    const match = finishedMatch(10);
    const status = noProgress();

    await expect(meatGrinder.handleMatch(match.players[3], match, status)).resolves.toBe('checkpoint');
    expect(status).toMatchObject({ progress: 1, matchId: match.id });
  });

  it('adds nothing when one player has fewer than 10 kills', async () => {
    const match = finishedMatch(9);
    const status = noProgress();

    await expect(meatGrinder.handleMatch(match.players[3], match, status)).resolves.toBe('progress');
    expect(status.progress).toBe(0);
  });
});
