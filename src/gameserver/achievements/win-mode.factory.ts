import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { BaseAchievement, Progress } from 'gameserver/achievements/base.achievement';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { AchievementKey } from 'gateway/shared-types/achievemen-key';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export const WinModeFactory = (key: AchievementKey, mode: MatchmakingMode) => {
  return class extends BaseAchievement {
    checkpoints = [1];
    key = key;

    supportsLobbyType(type: MatchmakingMode): boolean {
      return true;
    }

    async progress(
      pim: PlayerInMatchEntity,
      match: FinishedMatchEntity,
    ): Promise<Progress> {

      const game = await this.playerInMatchEntityRepository
        .createQueryBuilder("pim")
        .innerJoin("pim.match", "fm")
        .where("pim.team = fm.winner")
        .andWhere("fm.matchmaking_mode = :mode", {
          mode,
        })
        .andWhere("pim.playerId = :pid", { pid: pim.playerId })
        .orderBy('fm.timestamp', 'ASC')
        .limit(1)
        .getOne();

      return game
        ? {
            progress: 1,
            matchId: game.matchId,
          }
        : 0;
    }
  };
};
