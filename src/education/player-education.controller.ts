import { Body, Controller, Get, Param, Patch, UseInterceptors } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReqLoggingInterceptor } from 'rest/service/req-logging.interceptor';
import { EducationLockDto, PatchEducationLockDto } from 'rest/dto/player.dto';
import { EducationLockService } from './education-lock.service';

@Controller('player')
@ApiTags('player')
@UseInterceptors(ReqLoggingInterceptor)
export class PlayerEducationController {
  constructor(private readonly educationLockService: EducationLockService) {}

  @Get('/education_lock/:id')
  async getEducationLock(@Param('id') steamId: string): Promise<EducationLockDto | null> {
    return this.educationLockService.getEducationLock(steamId);
  }

  @Patch('/education_lock/:id')
  async patchEducationLock(
    @Param('id') steamId: string,
    @Body() dto: PatchEducationLockDto,
  ): Promise<EducationLockDto> {
    return this.educationLockService.patchEducationLock(steamId, dto.requiredGames);
  }
}
