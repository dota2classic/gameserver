import { Injectable } from '@nestjs/common';
import { PlayerIpEntity } from 'gameserver/model/player-ip.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { EventBus } from '@nestjs/cqrs';
import { PlayerSmurfDetectedEvent } from 'gateway/events/bans/player-smurf-detected.event';
import { BanReason } from 'gateway/shared-types/ban';
import { BanStatus } from 'gateway/queries/GetPlayerInfo/get-player-info-query.result';

interface PlayerIpWithBans {
  steam_id: string;
  end_time: Date;
  reason: BanReason;
}

@Injectable()
export class PlayerQualityService {
  constructor(
    @InjectRepository(PlayerIpEntity)
    private readonly playerIpEntityRepository: Repository<PlayerIpEntity>,
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanEntityRepository: Repository<PlayerBanEntity>,
    private readonly ebus: EventBus,
  ) {}

  public async getSmurfData(steamId: string): Promise<PlayerIpWithBans[]> {
    const allIps = await this.playerIpEntityRepository.find({
      where: {
        steamId,
      },
    });
    // Find all steam ids which share this ip

    return await this.playerIpEntityRepository
      .createQueryBuilder("pip")
      .leftJoinAndSelect(PlayerBanEntity, "pbe", "pbe.steam_id = pip.steamId")
      .where("pip.ip in (:...ips)", { ips: allIps.map((it) => it.ip) })
      .select('distinct pip.steam_id, pbe."endTime" as end_time, pbe.reason')
      .getRawMany<PlayerIpWithBans>();
  }

  public async onPlayerIpUpdated(steamId: string) {
    // Find all ips this player connected with
    const result = await this.getSmurfData(steamId);

    const hasActiveBan =
      result.filter((t) => t.end_time.getTime() > Date.now()).length > 0;

    if (!hasActiveBan) {
      return;
    }

    this.ebus.publish(
      new PlayerSmurfDetectedEvent(
        result.map((it) => it.steam_id),
        result.map(
          (it) =>
            new BanStatus(
              new Date().getTime() < it.end_time.getTime(),
              it.end_time.toISOString(),
              it.reason,
            ),
        ),
      ),
    );
  }
}
