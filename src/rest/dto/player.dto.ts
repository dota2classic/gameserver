import { BanReason } from 'gateway/shared-types/ban';
import { Page } from 'gateway/shared-types/page';
import { ApiProperty } from '@nestjs/swagger';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { MatchAccessLevel } from 'gateway/shared-types/match-access-level';

export class LeaderboardEntryDto {
  rank: number | null;

  steamId: string;
  seasonId: number;
  mmr: number;

  games: number;
  wins: number;
  abandons: number;

  kills: number;
  deaths: number;
  assists: number;

  playtime: number;
}

export class LeaderboardEntryPageDto extends Page<LeaderboardEntryDto> {
  data: LeaderboardEntryDto[];
  page: number;
  perPage: number;
  pages: number;
}

export class PlayerAspectCountDto {
  @ApiProperty({ enum: PlayerAspect, enumName: "PlayerAspect" })
  aspect: PlayerAspect;
  count: number;
}

export class PlayerReportsDto {
  steamId: string;
  playerAspects: PlayerAspectCountDto[];
}

export class PlayerSummaryDto {
  steamId: string;
  season: LeaderboardEntryDto;
  overall: LeaderboardEntryDto;

  calibrationGamesLeft: number;
  @ApiProperty({ enum: MatchAccessLevel, enumName: "MatchAccessLevel" })
  accessLevel: MatchAccessLevel;
  reports: PlayerAspectCountDto[];
}

export class SmurfData {
  relatedBans: BanStatusDto[];
}

export class BanStatusDto {
  public readonly steam_id: string;
  public readonly isBanned: boolean;
  // iso
  public readonly bannedUntil: string;

  @ApiProperty({ enum: BanReason, enumName: "BanReason" })
  public readonly status: BanReason;
}

export class ReportPlayerDto {
  public readonly reportedSteamId: string;
  public readonly reporterSteamId: string;
  public readonly text: string;
  public readonly matchId: number;

  @ApiProperty({ enum: PlayerAspect, enumName: "PlayerAspect" })
  public readonly aspect: PlayerAspect;
}

export class AbandonSessionDto {
  public readonly matchId: number;
  public readonly steamId: string;
}

export class ReportedMatrixDto {
  public readonly steamId: string;
  public readonly reported: string[];
}
export class MatchReportMatrixDto {
  public readonly matchId: number;
  public readonly timestamp: string;
  public readonly reports: ReportedMatrixDto[];
}

export class PlayerTeammateDto {
  public readonly steam_id: string;
  public readonly games: number;
  public readonly wins: number;
  public readonly losses: number;
  public readonly winrate: number;
  public readonly rank: number;
}

export class PlayerTeammatePage extends Page<PlayerTeammateDto> {
  data: PlayerTeammateDto[];
  page: number;
  perPage: number;
  pages: number;
}


export class DodgePlayerDto {
  steamId: string;
  toDodgeSteamId: string;
}


export class DodgeListEntryDto {
  steamId: string;
  createdAt: string;
}
