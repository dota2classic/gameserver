import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { delay, filter, map } from 'rxjs/operators';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerFoundEvent } from 'gateway/events/game-server-found.event';
import { CreateMatchCommand } from 'gameserver/command/CreateMatch/create-match.command';

@Injectable()
export class GameserverSaga {
  @Saga()
  listenReactions = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(RoomReadyEvent),
      map(
        e =>
          new FindGameServerCommand(
            e.roomId,
            Dota2Version.Dota_681,
            e.mode,
            e.radiant,
            e.dire,
            e.averageMMR,
            0,
          ),
      ),
    );
  };

  @Saga()
  gameServerFound = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GameServerFoundEvent),
      map(e => new CreateMatchCommand(e.mode, e.url)),
    );
  };

  @Saga()
  reFindServer = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GameServerNotFoundEvent),
      filter(t => t.tries < 5),
      delay(10_000), // let's wait 10 secs for now
      map(
        e =>
          new FindGameServerCommand(
            e.roomId,
            e.version,
            e.mode,
            e.radiant,
            e.dire,
            e.averageMMR,
            e.tries + 1,
          ),
      ),
    );
  };
}
