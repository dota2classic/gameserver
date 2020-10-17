import { Dota_GameState } from 'core.controller';

export class GameSessionUpdatedEvent {
  constructor(
    public readonly matchId: number,
    public readonly url: string,
    public readonly state: Dota_GameState,
  ) {}
}
