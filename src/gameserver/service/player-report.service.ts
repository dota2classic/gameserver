import { Injectable } from '@nestjs/common';
import { PlayerReportEntity } from 'gameserver/model/player-report.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { EventBus } from '@nestjs/cqrs';
import { PlayerReportStateUpdatedEvent } from 'gameserver/event/player-report-state-updated.event';
import { PlayerReportStatusEntity } from 'gameserver/model/player-report-status.entity';

@Injectable()
export class PlayerReportService {
  constructor(
    @InjectRepository(PlayerReportEntity)
    private readonly playerReportEntityRepository: Repository<PlayerReportEntity>,
    private readonly ebus: EventBus,
    @InjectRepository(PlayerReportStatusEntity)
    private readonly playerReportStatusEntityRepository: Repository<PlayerReportStatusEntity>,
    private readonly ds: DataSource,
  ) {}

  public async getPlayerReportState() {}

  public async handlePlayerReport(
    reporter: string,
    reported: string,
    aspect: PlayerAspect,
    commentary: string,
    matchId: number,
  ) {
    const prs = await this.playerReportStatusEntityRepository.findOneOrFail({
      where: {
        steam_id: reporter,
      },
    });

    if (prs.reports <= 0) {
      throw "No reports";
    }

    await this.ds.transaction(async (tx) => {
      await tx.save(
        PlayerReportEntity,
        {
          reporterSteamId: reporter,
          reportedSteamId: reported,
          commentary: commentary,
          aspect: aspect,
          matchId,
        }
      )
      await tx.update(
        PlayerReportStatusEntity,
        {
          steam_id: reporter,
        },
        {
          reports: () => "reports - 1",
        },
      );
    });

    this.ebus.publish(new PlayerReportStateUpdatedEvent(reported));

    return this.playerReportStatusEntityRepository.findOneOrFail({
      where: {
        steam_id: reporter,
      },
    });
  }
}
