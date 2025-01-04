import { GameResultsEvent } from 'gateway/events/gs/game-results.event';

export class SaveGameResultsCommand {
  constructor(
    public readonly event: GameResultsEvent
  ) {
  }
}
