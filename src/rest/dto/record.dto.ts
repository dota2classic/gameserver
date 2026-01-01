import { ApiProperty } from '@nestjs/swagger';
import { MatchDto } from 'rest/dto/match.dto';
import { PlayerRecordType } from 'rest/service/record.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';


export class PlayerRecordDto {
  @ApiProperty({ enum: PlayerRecordType, enumName: "RecordType" })
  recordType: PlayerRecordType;

  steamId: string;

  match?: MatchDto;
}


export class PlayerRecordsResponse {
  season: PlayerRecordDto[];
  overall: PlayerRecordDto[];
  month: PlayerRecordDto[];
  day: PlayerRecordDto[];
}


export class PlayerDailyRecord {
  steam_id: string;
  mmr_change: number;
  games: number;
  wins: number;
  loss: number;
}

export class PlayerYearSummaryDto {
  steam_id: string;

  last_hits: number;
  denies: number;
  gold: number;
  support_gold: number;

  kills: number;
  deaths: number;
  assists: number;
  misses: number;

  kda: number;
  played_games: number;

  @ApiProperty({ enum: MatchmakingMode, enumName: "MatchmakingMode" })
  most_played_mode: MatchmakingMode
  most_played_mode_count: number


  most_purchased_item: number
  most_purchased_item_count: number


}

