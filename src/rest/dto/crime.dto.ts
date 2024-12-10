import { BanReason } from 'gateway/shared-types/ban';
import { ApiProperty } from '@nestjs/swagger';
import { Page } from 'gateway/shared-types/page';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';


export class CrimeLogDto {
  readonly id: number;
  readonly handled: boolean;
  readonly steam_id: string;

  @ApiProperty({ enum: BanReason, enumName: 'BanReason' })
  readonly crime: BanReason

  @ApiProperty({ enum: MatchmakingMode, enumName: 'MatchmakingMode' })
  readonly lobby_type: MatchmakingMode
  readonly created_at: string;

}
export class CrimeLogPageDto extends Page<CrimeLogDto> {
  data: CrimeLogDto[];
  pages: number;
  perPage: number;
  page: number;
}
