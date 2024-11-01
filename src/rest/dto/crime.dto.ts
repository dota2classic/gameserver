import { Page } from 'rest/dto/page';
import { BanReason } from 'gateway/shared-types/ban';
import { ApiProperty } from '@nestjs/swagger';


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
