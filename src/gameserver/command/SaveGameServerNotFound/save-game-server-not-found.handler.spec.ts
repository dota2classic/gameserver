import { useFullModule } from '@test/useFullModule';
import { SaveGameServerNotFoundHandler } from 'gameserver/command/SaveGameServerNotFound/save-game-server-not-found.handler';
import { SaveGameServerNotFoundCommand } from 'gameserver/command/SaveGameServerNotFound/save-game-server-not-found.command';
import { MatchEntity } from 'gameserver/model/match.entity';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { ReturnGoodPlayersToQueueEvent } from 'gateway/events/mm/return-good-players-to-queue.event';
import {
  FullMatchPlayer,
  LaunchGameServerCommand,
} from 'gateway/commands/LaunchGameServer/launch-game-server.command';
import { GameServerPluginParameters } from 'gateway/commands/LaunchGameServer/game-server-plugin-parameters';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { Dota_Map } from 'gateway/shared-types/dota-map';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { DotaPatch } from 'gateway/constants/patch';
import { Region } from 'gateway/shared-types/region';

describe('SaveGameServerNotFoundHandler', () => {
  const te = useFullModule();

  async function makeMatchStub(steamIds: string[], started: boolean): Promise<number> {
    const me = new MatchEntity();
    me.started = started;
    me.finished = false;
    me.server = MatchEntity.NOT_DECIDED_SERVER;
    me.mode = MatchmakingMode.UNRANKED;
    me.matchInfoJson = new LaunchGameServerCommand(
      -1,
      MatchmakingMode.UNRANKED,
      Dota_GameMode.RANKED_AP,
      'room-1',
      Dota_Map.DOTA,
      steamIds.map((id) => new FullMatchPlayer(id, `player-${id}`, false, false, `party-${id}`, DotaTeam.RADIANT)),
      DotaPatch.DOTA_684,
      Region.RU_MOSCOW,
      new GameServerPluginParameters(false, false, 0, false, false, false),
    );
    await te.repo(MatchEntity).save(me);
    return me.id;
  }

  async function serverNotFound(matchId: number) {
    await te
      .service(SaveGameServerNotFoundHandler)
      .execute(new SaveGameServerNotFoundCommand(new GameServerNotFoundEvent(matchId)));
  }

  function requeuesOf(matchId: number): ReturnGoodPlayersToQueueEvent[] {
    return te.ebusSpy.mock.calls
      .map(([event]) => event)
      .filter((event): event is ReturnGoodPlayersToQueueEvent =>
        event instanceof ReturnGoodPlayersToQueueEvent && event.matchId === matchId,
      );
  }

  it('returns every player of a match without a server to the queue exactly once', async () => {
    const matchId = await makeMatchStub(['111', '222'], false);

    await serverNotFound(matchId);
    await serverNotFound(matchId);

    const requeues = requeuesOf(matchId);
    expect(requeues).toHaveLength(1);
    expect(requeues[0].steamIds).toEqual(['111', '222']);
    expect((await te.repo(MatchEntity).findOneByOrFail({ id: matchId })).finished).toBe(true);
  });

  it('leaves a started match untouched', async () => {
    const matchId = await makeMatchStub(['333'], true);

    await serverNotFound(matchId);

    expect(requeuesOf(matchId)).toHaveLength(0);
    expect((await te.repo(MatchEntity).findOneByOrFail({ id: matchId })).finished).toBe(false);
  });
});
