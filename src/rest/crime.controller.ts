import { ApiQuery, ApiTags } from '@nestjs/swagger';
import { Controller, Get, Query } from '@nestjs/common';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NullableIntPipe } from 'util/pipes';
import { makePage } from 'util/pagination';
import { CrimeLogPageDto } from 'rest/dto/crime.dto';

@Controller('crime')
@ApiTags('crime')
export class CrimeController {

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
  ) {
  }


  @ApiQuery({
    name: 'page',
    required: true,
  })
  @ApiQuery({
    name: 'per_page',
    required: false,
  })
  @ApiQuery({
    name: 'steam_id',
    required: false
  })
  @Get('')
  public async crimeLog(
    @Query('page', NullableIntPipe) page: number,
    @Query('per_page', NullableIntPipe) perPage: number = 25,
    @Query('steam_id') steamId: string | undefined = undefined
  ): Promise<CrimeLogPageDto>{
    const [crimes, count] = await this.playerCrimeLogEntityRepository
      .createQueryBuilder()
      .where(steamId ? { steam_id: steamId } : {})
      .orderBy('created_at', 'DESC')
      .take(perPage)
      .skip(perPage * page)
      .getManyAndCount();

    return makePage(crimes, count, page, perPage)
  }


}
