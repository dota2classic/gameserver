import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { MatchInfo, RoomReadyEvent } from 'gateway/events/room-ready.event';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import * as uuidr from 'uuid';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';

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
              e.players,
              e.averageMMR,
              e.version,
            ),
            0,
          ),
      ),
    );
  };


  // @Saga()
  // tournamentGameReady = (events$: Observable<any>): Observable<ICommand> => {
  //   return events$.pipe(
  //     ofType(TournamentGameReadyEvent),
  //     map(
  //       e =>
  //         new FindGameServerCommand(
  //           new MatchInfo(
  //             e.mode,
  //             uuid(),
  //             e.radiant,
  //             e.dire,
  //             0,
  //             e.version,
  //             e.tournamentId,
  //             e.tourMatchId
  //           ),
  //           0,
  //         ),
  //     ),
  //   );
  // };

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
      filter(t => t.type === MatchmakingMode.RANKED || t.type === MatchmakingMode.UNRANKED),
      map((e: GameResultsEvent) => {

        const losers = e.players
          .filter(p => p.team !== e.winner)
          .map(t => new PlayerId(t.steam_id));
        const winners = e.players
          .filter(p => p.team === e.winner)
          .map(t => new PlayerId(t.steam_id));

        return new ProcessRankedMatchCommand(e.matchId, winners, losers, e.type);
      }),
    );
  };

  @Saga()
  processAchievements = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GameResultsEvent),
      map((e: GameResultsEvent) => {
        return new ProcessAchievementsCommand(e.matchId, e.type);
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
