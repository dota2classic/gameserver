import { BanReason } from 'gateway/shared-types/ban';

export class LeaderboardEntryDto {
  steam_id: string;
  mmr: number;
}

export class PlayerSummaryDto {
  mmr: number;
  steam_id: string;
  rank: number;
  newbieUnrankedGamesLeft: number;
}

export class BanStatusDto {
  public readonly steam_id: string;
  public readonly isBanned: boolean;
  public readonly bannedUntil: number;
  public readonly status: BanReason;
}
