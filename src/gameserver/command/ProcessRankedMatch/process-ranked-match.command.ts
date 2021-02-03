import { PlayerId } from 'gateway/shared-types/player-id';

export class ProcessRankedMatchCommand {
  constructor(
    public readonly matchId: number,
    public readonly winners: PlayerId[],
    public readonly losers: PlayerId[],
  ) {}
}
