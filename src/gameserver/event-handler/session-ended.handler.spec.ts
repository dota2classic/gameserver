import { useFullModule } from '@test/useFullModule';
import { SessionEndedHandler } from 'gameserver/event-handler/session-ended.handler';
import { SessionEndedEvent } from 'gameserver/event/session-ended.event';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { GameSessionPlayerEntity } from 'gameserver/model/game-session-player.entity';
import { MatchEntity } from 'gameserver/model/match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { Dota_Map } from 'gateway/shared-types/dota-map';
import { Dota_GameRulesState } from 'gateway/shared-types/dota-game-rules-state';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { DotaConnectionState } from 'gateway/shared-types/dota-player-connection-state';
import { MatchFinishedEvent } from 'gateway/events/match-finished.event';
import { ReturnGoodPlayersToQueueEvent } from 'gateway/events/mm/return-good-players-to-queue.event';

describe('SessionEndedHandler', () => {
  const te = useFullModule();

  const SERVER_URL = 'test.server.local';

  async function createSession(matchId: number, steamIds: string[]): Promise<void> {
    const session = new GameServerSessionEntity(
      matchId,
      SERVER_URL,
      'room-1',
      MatchmakingMode.RANKED,
      Dota_GameMode.RANKED_AP,
      Dota_Map.DOTA,
      Dota_GameRulesState.WAIT_FOR_PLAYERS_TO_LOAD,
      0,
    );
    await te.repo(GameServerSessionEntity).save(session);

    const players = steamIds.map(
      (id) =>
        new GameSessionPlayerEntity(
          id,
          matchId,
          'party-1',
          DotaTeam.RADIANT,
          DotaConnectionState.DOTA_CONNECTION_STATE_NOT_YET_CONNECTED,
        ),
    );
    await te.repo(GameSessionPlayerEntity).save(players);
  }

  async function makeMatch(): Promise<number> {
    const me = new MatchEntity();
    me.started = true;
    me.finished = false;
    me.server = SERVER_URL;
    me.mode = MatchmakingMode.RANKED;
    await te.repo(MatchEntity).save(me);
    return me.id;
  }

  it('COMPLETED: clears session and emits MatchFinishedEvent', async () => {
    const matchId = await makeMatch();
    await createSession(matchId, ['111', '222']);

    await te.service(SessionEndedHandler).handle(new SessionEndedEvent(SERVER_URL, 'COMPLETED'));

    const session = await te.repo(GameServerSessionEntity).findOne({ where: { matchId } });
    expect(session).toBeNull();

    const call = te.ebusSpy.mock.calls.find(([e]) => e instanceof MatchFinishedEvent);
    expect(call).toBeDefined();
    expect(call![0].matchId).toBe(matchId);
  });

  it('CRASHED: clears session and emits MatchFinishedEvent', async () => {
    const matchId = await makeMatch();
    await createSession(matchId, ['333', '444']);

    await te.service(SessionEndedHandler).handle(new SessionEndedEvent(SERVER_URL, 'CRASHED'));

    const session = await te.repo(GameServerSessionEntity).findOne({ where: { matchId } });
    expect(session).toBeNull();

    expect(te.ebusSpy).toHaveBeenCalledWith(
      expect.objectContaining({ matchId } as any),
    );
    const call = te.ebusSpy.mock.calls.find(([e]) => e instanceof MatchFinishedEvent);
    expect(call).toBeDefined();
  });

  it('LOAD_FAILURE: clears session and emits ReturnGoodPlayersToQueueEvent with non-failed players', async () => {
    const matchId = await makeMatch();
    await createSession(matchId, ['555', '666', '777']);

    await te
      .service(SessionEndedHandler)
      .handle(new SessionEndedEvent(SERVER_URL, 'LOAD_FAILURE', ['555']));

    const session = await te.repo(GameServerSessionEntity).findOne({ where: { matchId } });
    expect(session).toBeNull();

    const call = te.ebusSpy.mock.calls.find(([e]) => e instanceof ReturnGoodPlayersToQueueEvent);
    expect(call).toBeDefined();
    const event: ReturnGoodPlayersToQueueEvent = call![0];
    expect(event.steamIds).toHaveLength(2);
    expect(event.steamIds).toContain('666');
    expect(event.steamIds).toContain('777');
    expect(event.matchId).toBe(matchId);
    expect(event.mode).toBe(MatchmakingMode.RANKED);
  });

  it('idempotent: no-op and no events when session does not exist', async () => {
    await te
      .service(SessionEndedHandler)
      .handle(new SessionEndedEvent('nonexistent.server', 'COMPLETED'));

    expect(te.ebusSpy).not.toHaveBeenCalled();
  });

  it('idempotent: second call after session already cleared emits nothing', async () => {
    const matchId = await makeMatch();
    await createSession(matchId, ['888', '999']);

    await te.service(SessionEndedHandler).handle(new SessionEndedEvent(SERVER_URL, 'COMPLETED'));
    te.ebusSpy.mockReset();

    await te.service(SessionEndedHandler).handle(new SessionEndedEvent(SERVER_URL, 'CRASHED'));

    expect(te.ebusSpy).not.toHaveBeenCalled();
  });
});
