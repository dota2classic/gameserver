import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { AbandonSessionDto } from 'rest/dto/player.dto';
import { GameSessionService } from 'gameserver/service/game-session.service';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerSessionController {
  constructor(private readonly sessionService: GameSessionService) {}

  @Post('/abandon')
  async abandonSession(@Body() dto: AbandonSessionDto) {
    await this.sessionService.abandonSession(dto.steamId);
  }
}
