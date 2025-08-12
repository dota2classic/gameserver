import { EventBus } from '@nestjs/cqrs';
import { inspect } from 'util';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { Repository } from 'typeorm';
import { NestApplicationContext } from '@nestjs/core/nest-application-context';
import { Dota_Map } from 'gateway/shared-types/dota-map';
import { DotaPatch } from 'gateway/constants/patch';
import Mock = jest.Mock;

export const randomUser = () => {
  return user(`${Math.round(Math.random() * 1000000)}`);
};

export const user1 = new PlayerId("1062901073");
export const user2 = new PlayerId("116514945");

export const user = (id: string) => new PlayerId(id);

export function printCalls(bus: EventBus) {
  const p = bus.publish as Mock;
  console.log(inspect(p.mock.calls));
}

export function arrayOf(size: number) {
  return new Array(size).fill(null);
}

export function createGameMode(
  app: NestApplicationContext,
  lobby: MatchmakingMode,
  mode: Dota_GameMode,
  map: Dota_Map,
  enabled: boolean,
): Promise<MatchmakingModeMappingEntity> {
  const rep: Repository<MatchmakingModeMappingEntity> = app.get(
    getRepositoryToken(MatchmakingModeMappingEntity),
  );
  return rep.save({
    lobbyType: lobby,
    dotaGameMode: mode,
    dotaMap: map,
    enabled,
    fillBots: false,
    enableCheats: false,
    patch: DotaPatch.DOTA_684
  } satisfies MatchmakingModeMappingEntity);
}
