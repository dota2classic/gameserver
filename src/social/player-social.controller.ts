import { Body, Controller, Delete, Get, Post, Query, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { DodgeListEntryDto, DodgePlayerDto } from 'rest/dto/player.dto';
import { DodgeListEntity } from 'gameserver/model/dodge-list.entity';
import { DodgeService } from 'rest/service/dodge.service';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerSocialController {
  constructor(private readonly dodge: DodgeService) {}

  private mapDodgeEntry = (it: DodgeListEntity): DodgeListEntryDto => ({
    steamId: it.dodgedSteamId,
    createdAt: it.createdAt.toISOString(),
  });

  @Get('/dodge_list')
  async getDodgeList(@Query('steamId') steamId: string): Promise<DodgeListEntryDto[]> {
    return this.dodge.getDodgeList(steamId).then((all) => all.map(this.mapDodgeEntry));
  }

  @Post('/dodge_list')
  async dodgePlayer(@Body() dto: DodgePlayerDto): Promise<DodgeListEntryDto[]> {
    return this.dodge.dodgePlayer(dto.steamId, dto.toDodgeSteamId).then((all) => all.map(this.mapDodgeEntry));
  }

  @Delete('/dodge_list')
  async unDodgePlayer(@Body() dto: DodgePlayerDto): Promise<DodgeListEntryDto[]> {
    return this.dodge.unDodgePlayer(dto.steamId, dto.toDodgeSteamId).then((all) => all.map(this.mapDodgeEntry));
  }
}
