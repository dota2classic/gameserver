import { Injectable } from '@nestjs/common';
import { ICommand, ofType, Saga } from '@nestjs/cqrs';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { PlayerId } from 'gateway/shared-types/player-id';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';
import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';
import { FindGameServerCommand } from 'gameserver/command/FindGameServer/find-game-server.command';
import { MatchRecordedEvent } from 'gateway/events/gs/match-recorded.event';

@Injectable()
export class GameserverSaga {
  @Saga()
  findServer = (events$: Observable<any>): Observable<ICommand> => {
    return events$.pipe(
      ofType(GamePreparedEvent),
      map((e: GamePreparedEvent) => new FindGameServerCommand(e)),
    );
  };

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
