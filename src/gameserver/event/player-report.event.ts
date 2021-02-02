import { PlayerId } from 'gateway/shared-types/player-id';

export class PlayerReportEvent {
  constructor(
    public readonly matchId: number,
    public readonly reporter: PlayerId,
    public readonly reported: PlayerId,
    public readonly text: string
  ) {
  }
}
