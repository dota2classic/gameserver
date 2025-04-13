import { GSMatchInfo } from 'gateway/commands/LaunchGameServer/launch-game-server.command';

export class AssignStartedServerCommand {
  constructor(
    public readonly server: string,
    public readonly matchId: number,
    public readonly info: GSMatchInfo,
  ) {}
}
