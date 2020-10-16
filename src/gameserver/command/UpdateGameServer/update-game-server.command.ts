import { Dota2Version } from 'gateway/shared-types/dota2version';

export class UpdateGameServerCommand {
  constructor(
    public readonly url: string,
    public readonly version: Dota2Version,
    public readonly running: boolean,
  ) {}
}
