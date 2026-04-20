export class SessionEndedEvent {
  constructor(
    public readonly serverUrl: string,
    public readonly reason: 'COMPLETED' | 'LOAD_FAILURE' | 'CRASHED',
    public readonly failedPlayers: string[] = [],
  ) {}
}
