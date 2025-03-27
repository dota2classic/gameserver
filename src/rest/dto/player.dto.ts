import { BanReason } from 'gateway/shared-types/ban';
import { Page } from 'gateway/shared-types/page';
import { ApiProperty } from '@nestjs/swagger';
import { MatchAccessLevel } from 'rest/service/player.service';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';

export class LeaderboardEntryDto {
  rank: number | null;

  steamId: string;
  seasonId: number;
  mmr: number;

  games: number;
  wins: number;

  kills: number;
  deaths: number;
  assists: number;

  playtime: number;

}

export class LeaderboardEntryPageDto extends Page<LeaderboardEntryDto> {
  data: LeaderboardEntryDto[]
  page: number;
  perPage: number;
  pages: number;
}




export class PlayerSummaryDto extends LeaderboardEntryDto {

  calibrationGamesLeft: number;
  accessLevel: MatchAccessLevel

}

export class BanStatusDto {
  public readonly steam_id: string;
  public readonly isBanned: boolean;
  // iso
  public readonly bannedUntil: string;

  @ApiProperty({ enum: BanReason, enumName: 'BanReason' })
  public readonly status: BanReason;
}

export class ReportPlayerDto {
  public readonly reportedSteamId: string;
  public readonly reporterSteamId: string;
  public readonly text: string;
  public readonly matchId: number;

  @ApiProperty({ enum: PlayerAspect, enumName: 'PlayerAspect' })
  public readonly aspect: PlayerAspect;
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
  data: PlayerTeammateDto[]
  page: number;
  perPage: number;
  pages: number;
}
