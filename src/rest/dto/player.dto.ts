import { BanReason } from 'gateway/shared-types/ban';
import { PlayerId } from 'gateway/shared-types/player-id';

export class LeaderboardEntryDto {
  rank: number | null;

  steam_id: string;
  mmr: number;

  games: number;
  wins: number;

  kills: number;
  deaths: number;
  assists: number;

  play_time: number;
}

export class PlayerSummaryDto extends LeaderboardEntryDto {
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
