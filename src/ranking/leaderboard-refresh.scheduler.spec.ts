import { Repository } from 'typeorm';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MetricsService } from 'metrics/metrics.service';
import { LeaderboardRefreshScheduler, MAX_TICKS_BETWEEN_REFRESHES } from 'ranking/leaderboard-refresh.scheduler';

describe('LeaderboardRefreshScheduler', () => {
  const setup = () => {
    const state = { counters: '16386:10:2:0,16390:100:0:0' as string | null, unreadable: false };
    const refreshes: string[] = [];
    const query = jest.fn(async (sql: string) => {
      if (sql.includes('pg_stat_user_tables')) {
        if (state.unreadable) throw new Error('stats unavailable');
        return [{ counters: state.counters }];
      }
      refreshes.push(sql);
      return [];
    });
    const scheduler = new LeaderboardRefreshScheduler(
      { query } as unknown as Repository<LeaderboardView>,
      undefined as unknown as Repository<GameServerSessionEntity>,
      undefined as unknown as MetricsService,
    );
    jest.spyOn(scheduler['logger'], 'log').mockImplementation(() => undefined);
    jest.spyOn(scheduler['logger'], 'error').mockImplementation(() => undefined);
    return { scheduler, state, refreshes };
  };

  it('refreshes on the first tick, skips unchanged counters and forces a refresh after the maximum ticks', async () => {
    const { scheduler, refreshes } = setup();

    for (let tick = 0; tick < MAX_TICKS_BETWEEN_REFRESHES; tick++) {
      await scheduler.refreshLeaderboard();
    }
    expect(refreshes).toHaveLength(1);

    await scheduler.refreshLeaderboard();
    expect(refreshes).toHaveLength(2);
    expect(refreshes[0]).toBe('refresh materialized view concurrently leaderboard_view');
  });

  it('refreshes when any table counter changes, including a reset to lower values', async () => {
    const { scheduler, state, refreshes } = setup();
    await scheduler.refreshLeaderboard();

    state.counters = '16386:10:2:0,16390:0:0:0';
    await scheduler.refreshLeaderboard();
    await scheduler.refreshLeaderboard();

    expect(refreshes).toHaveLength(2);
  });

  it('refreshes on every tick while the counters cannot be read', async () => {
    const { scheduler, state, refreshes } = setup();
    state.unreadable = true;

    await scheduler.refreshLeaderboard();
    await scheduler.refreshLeaderboard();
    await scheduler.refreshLeaderboard();

    expect(refreshes).toHaveLength(3);
  });
});
