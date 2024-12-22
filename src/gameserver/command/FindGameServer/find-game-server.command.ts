import { GamePreparedEvent } from 'gameserver/event/game-prepared.event';

export class FindGameServerCommand {
  constructor(
    public readonly info: GamePreparedEvent,
    public readonly tries: number
  ) {}
}
