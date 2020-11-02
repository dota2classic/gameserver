import { PlayerId } from 'gateway/shared-types/player-id';

export class MakeSureExistsCommand {
  constructor(public readonly id: PlayerId) {
  }
}