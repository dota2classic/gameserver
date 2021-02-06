import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { delay, filter, map } from 'rxjs/operators';
import { GameServerNotFoundEvent } from 'gateway/events/game-server-not-found.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { MatchInfo, RoomReadyEvent } from 'gateway/events/room-ready.event';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { TournamentGameReadyEvent } from 'gateway/events/tournament/tournament-game-ready.event';
import * as uuidr from "uuid";

export const uuid = (): string => uuidr.v4();


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
  tournamentGameReady = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(TournamentGameReadyEvent),
      map(
        e =>
          new FindGameServerCommand(
            new MatchInfo(
              e.mode,
              uuid(),
              e.radiant,
              e.dire,
              0,
              Dota2Version.Dota_681,
              e.tournamentId,
              e.tourMatchId
            ),
            0,
          ),
      ),
    );
  };

  // @Saga()
  // updateReceived = (events$: Observable<any>): Observable<ICommand> => {
  //   return events$.pipe(
  //     ofType(GameServerUpdateReceivedEvent),
  //     map(e => new UpdateGameServerCommand(
  //       e.url,
  //       e.version,
  //       e.running
  //     )),
  //   );
  // };

  @Saga()
  processRanked = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GameResultsEvent),
      filter(t => t.type === MatchmakingMode.RANKED),
      map(e => {
        const winnerTeam = e.radiantWin ? 2 : 3;

        const losers = e.players
          .filter(p => p.team !== winnerTeam)
          .map(t => new PlayerId(t.steam_id));
        const winners = e.players
          .filter(p => p.team === winnerTeam)
          .map(t => new PlayerId(t.steam_id));

        return new ProcessRankedMatchCommand(e.matchId, winners, losers);
      }),
    );
  };

  //
  // @Saga()
  // sessionCreated = (events$: Observable<any>): Observable<ICommand> => {
  //   return events$.pipe(
  //     ofType(GameSessionCreatedEvent),
  //     map(e => new FindGameServerCommand(e.info, e.tries + 1)),
  //   );
  // };
}
