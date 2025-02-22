import { ApiProperty } from '@nestjs/swagger';
import { MatchDto } from 'rest/dto/match.dto';
import { PlayerRecordType } from 'rest/service/record.service';


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
}
