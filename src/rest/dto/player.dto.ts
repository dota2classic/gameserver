import { BanReason } from 'gateway/shared-types/ban';
import { PlayerId } from 'gateway/shared-types/player-id';

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


export class ReportPlayerDto {
  public readonly reported: PlayerId;
  public readonly reporter: PlayerId;
  public readonly text: string;
  public readonly matchId: number;
}
