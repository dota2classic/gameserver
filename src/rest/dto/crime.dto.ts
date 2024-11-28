import { BanReason } from 'gateway/shared-types/ban';
import { ApiProperty } from '@nestjs/swagger';
import { Page } from 'gateway/shared-types/page';


export class CrimeLogDto {
  readonly id: number;
  readonly handled: boolean;
  readonly steam_id: string;

  @ApiProperty({ enum: BanReason, enumName: 'BanReason' })
  readonly crime: BanReason
  readonly created_at: string;

}
export class CrimeLogPageDto extends Page<CrimeLogDto> {
  data: CrimeLogDto[];
  pages: number;
  perPage: number;
  page: number;
}
