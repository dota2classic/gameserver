import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export class CreateMatchCommand {
  constructor(public readonly mode: MatchmakingMode, public readonly url: string) {
  }
}