import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UpdateEducationLockCommand } from './update-education-lock.command';
import { PlayerEducationLockEntity } from 'gameserver/model/player-education-lock.entity';

@CommandHandler(UpdateEducationLockCommand)
export class UpdateEducationLockHandler
  implements ICommandHandler<UpdateEducationLockCommand>
{
  private static readonly RECENT_WINDOW = 5;
  private static readonly KDA_THRESHOLD = 2.0;
  private static readonly WINRATE_THRESHOLD = 0.6;

  private readonly logger = new Logger(UpdateEducationLockHandler.name);

  constructor(
    @InjectRepository(PlayerEducationLockEntity)
    private readonly lockRepo: Repository<PlayerEducationLockEntity>,
    private readonly ds: DataSource,
  ) {}

  async execute(command: UpdateEducationLockCommand): Promise<void> {
    const results = await Promise.allSettled(
      command.steamIds.map((id) => this.processPlayer(id)),
    );
    results.forEach((result, i) => {
      if (result.status === 'rejected') {
        this.logger.error(
          `Failed to update education lock for ${command.steamIds[i]}`,
          result.reason,
        );
      }
    });
  }

  private async processPlayer(steamId: string): Promise<void> {
    const lock = await this.lockRepo.findOne({ where: { steamId } });
    if (!lock || lock.resolved) return;

    const stats = await this.queryBotStats(steamId);

    lock.totalBotGames = stats.total_games;
    lock.recentKda = stats.recent_kda;
    lock.recentWinrate = stats.recent_winrate;

    if (stats.total_games >= lock.requiredGames) {
      if (
        stats.recent_kda >= UpdateEducationLockHandler.KDA_THRESHOLD &&
        stats.recent_winrate >= UpdateEducationLockHandler.WINRATE_THRESHOLD
      ) {
        lock.resolved = true;
      } else {
        // Performance insufficient — compute minimum games needed to theoretically qualify
        lock.requiredGames = this.computeNextRequiredGames(
          stats.total_games,
          stats.recent_winrate,
        );
      }
    }

    await this.lockRepo.save(lock);
  }

  /**
   * Returns the minimum total games the player needs to reach so that,
   * assuming they win every game from here, they can hit the winrate threshold
   * over the recent window.
   *
   * Best-case assumption: new wins push out the oldest (worst) games first.
   */
  private computeNextRequiredGames(totalGames: number, recentWinrate: number): number {
    const W = UpdateEducationLockHandler.RECENT_WINDOW;
    const T = UpdateEducationLockHandler.WINRATE_THRESHOLD;

    const windowSize    = Math.min(totalGames, W);
    const currentWins   = Math.round(recentWinrate * windowSize);

    for (let k = 1; k <= W; k++) {
      const newWindowSize = Math.min(totalGames + k, W);
      const neededWins    = Math.ceil(T * newWindowSize);
      const winsFromOld   = Math.min(currentWins, Math.max(0, newWindowSize - k));
      if (k + winsFromOld >= neededWins) {
        return totalGames + k;
      }
    }

    return totalGames + W; // unreachable: k=W always fills window with wins
  }

  private async queryBotStats(steamId: string): Promise<{
    total_games: number;
    recent_kda: number;
    recent_winrate: number;
  }> {
    const rows = await this.ds.query<
      { total_games: number; recent_kda: number; recent_winrate: number }[]
    >(
      `
      WITH all_bot_games AS (
        SELECT
          pim.kills,
          pim.deaths,
          pim.assists,
          (pim.team = fm.winner) AS won,
          ROW_NUMBER() OVER (ORDER BY fm.timestamp DESC) AS rn,
          COUNT(*) OVER ()                               AS total_count
        FROM player_in_match pim
        INNER JOIN finished_match fm ON fm.id = pim."matchId"
        WHERE pim."playerId" = $1
          AND fm.matchmaking_mode IN (7, 13)
      )
      SELECT
        COALESCE(MAX(total_count), 0)::int                                                              AS total_games,
        COALESCE(AVG((kills + assists)::float / GREATEST(deaths, 1)) FILTER (WHERE rn <= $2), 0)::float AS recent_kda,
        COALESCE(AVG(won::int)                                        FILTER (WHERE rn <= $2), 0)::float AS recent_winrate
      FROM all_bot_games
      `,
      [steamId, UpdateEducationLockHandler.RECENT_WINDOW],
    );

    return rows[0] ?? { total_games: 0, recent_kda: 0, recent_winrate: 0 };
  }
}
