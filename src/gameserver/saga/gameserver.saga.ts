import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { delay, filter, map } from 'rxjs/operators';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { MatchInfo, RoomReadyEvent } from 'gateway/events/room-ready.event';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameServerFoundEvent } from 'gateway/events/game-server-found.event';
import { CreateMatchCommand } from 'gameserver/command/CreateMatch/create-match.command';
import { MatchCreatedEvent } from 'gameserver/event/match-created.event';
import { StartGameServerCommand } from 'gameserver/command/StartGameServer/start-game-server.command';

@Injectable()
export class GameserverSaga {
  @Saga()
  listenReactions = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(RoomReadyEvent),
      map(
        e =>
          new FindGameServerCommand(
            new MatchInfo(
              e.mode,
              e.roomId,
              e.radiant,
              e.dire,
              e.averageMMR,
              Dota2Version.Dota_681,
            ),
            0,
          ),
      ),
    );
  };

  @Saga()
  gameServerFound = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GameServerFoundEvent),
      map(e => new CreateMatchCommand(e.url, e.info)),
    );
  };

  @Saga()
  matchCreated = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(MatchCreatedEvent),
      map(e => new StartGameServerCommand(e.id, e.url, e.info)),
    );
  };

  @Saga()
  reFindServer = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GameServerNotFoundEvent),
      filter(t => t.tries < 5),
      delay(10_000), // let's wait 10 secs for now
      map(e => new FindGameServerCommand(e.info, e.tries + 1)),
    );
  };
}
