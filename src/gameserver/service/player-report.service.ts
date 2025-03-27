import { Injectable } from '@nestjs/common';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { EventBus } from '@nestjs/cqrs';
import { PlayerReportStateUpdatedEvent } from 'gameserver/event/player-report-state-updated.event';

@Injectable()
export class PlayerReportService {
  constructor(
    @InjectRepository(PlayerReportEntity)
    private readonly playerReportEntityRepository: Repository<PlayerReportEntity>,
    private readonly ebus: EventBus,
  ) {}


  public async getPlayerReportState(){

  }

  public async handlePlayerReport(
    reporter: string,
    reported: string,
    aspect: PlayerAspect,
    commentary: string,
  ) {
    await this.playerReportEntityRepository.upsert(
      {
        reporterSteamId: reporter,
        reportedSteamId: reported,
        commentary: commentary,
        aspect: aspect,
      },
      ["reporterSteamId", "reportedSteamId"],
    );

    this.ebus.publish(new PlayerReportStateUpdatedEvent(reported));
  }
}
