import { AchievementKey } from 'gameserver/achievements/base.achievement';

export class AchievementCompleteEvent {
  constructor(
    public readonly achievement: AchievementKey,
    public readonly playerId: string,
    public readonly hero: string,
    public readonly matchId: number,
  ) {}
}
