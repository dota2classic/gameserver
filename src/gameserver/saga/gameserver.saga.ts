import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { RoomReadyEvent } from 'gateway/events/room-ready.event';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import * as uuidr from 'uuid';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';
import { PrepareGameCommand } from 'gameserver/command/PrepareGame/prepare-game.command';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { MatchRecordedEvent } from 'gateway/events/gs/match-recorded.event';

export const uuid = (): string => uuidr.v4();

@Injectable()
export class GameserverSaga {
  @Saga()
  prepareRoomGame = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(RoomReadyEvent),
      map(
        (e: RoomReadyEvent) =>
          new PrepareGameCommand(e.mode, e.roomId, e.players, e.version),
      ),
    );
  };

  @Saga()
  findServer = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GamePreparedEvent),
      map((e: GamePreparedEvent) => new FindGameServerCommand(e)),
    );
  };

  // GamePreparedEvent

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
      ofType(MatchRecordedEvent),
      filter(
        (t: MatchRecordedEvent) =>
          t.type === MatchmakingMode.RANKED ||
          t.type === MatchmakingMode.UNRANKED,
      ),
      map((e: MatchRecordedEvent) => {
        const losers = e.players
          .filter((p) => p.team !== e.winner)
          .map((t) => new PlayerId(t.steam_id));
        const winners = e.players
          .filter((p) => p.team === e.winner)
          .map((t) => new PlayerId(t.steam_id));

        return new ProcessRankedMatchCommand(
          e.matchId,
          winners,
          losers,
          e.type,
        );
      }),
    );
  };

  @Saga()
  processAchievements = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(MatchRecordedEvent),
      map((e: MatchRecordedEvent) => {
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
