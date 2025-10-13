export class LeaveGameSessionCommand {
  constructor(public readonly steamId: string, public readonly matchId: number, public readonly userAbandon) {}
}
