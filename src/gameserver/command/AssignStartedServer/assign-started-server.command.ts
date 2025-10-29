export class AssignStartedServerCommand {
  constructor(
    public readonly matchId: number,
    public readonly server: string,
  ) {}
}
