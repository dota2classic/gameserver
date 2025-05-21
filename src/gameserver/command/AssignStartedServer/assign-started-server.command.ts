import { LaunchGameServerCommand } from 'gateway/commands/LaunchGameServer/launch-game-server.command';

export class AssignStartedServerCommand {
  constructor(
    public readonly server: string,
    public readonly info: LaunchGameServerCommand,
  ) {}
}
