import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CRIMES_INTERVAL_FOR_MULTIPLY, HARD_PUNISHMENT, LIGHT_PUNISHMENT } from 'gateway/shared-types/timings';
import { PlayerBan } from 'gameserver/entity/PlayerBan';
import { BanReason } from 'gateway/shared-types/ban';
import { Logger } from '@nestjs/common';
import { BanSystemEntry, BanSystemEvent } from 'gateway/events/gs/ban-system.event';
import { PlayerId } from 'gateway/shared-types/player-id';

export const calcCumulativePunishment = (
  totalCrimes: PlayerCrimeLogEntity[],
) => {
  return totalCrimes
    .map(t => {
      switch (t.crime) {
        case BanReason.INFINITE_BAN:
          return Infinity;
        case BanReason.GAME_DECLINE:
          return LIGHT_PUNISHMENT;
        case BanReason.LOAD_FAILURE:
          return LIGHT_PUNISHMENT;
        case BanReason.REPORTS:
          return HARD_PUNISHMENT;
        default:
          return 0;
      }
    })
    .reduce((a, b) => a + b, 0);
};

@EventsHandler(CrimeLogCreatedEvent)
export class CrimeLogCreatedHandler
  implements IEventHandler<CrimeLogCreatedEvent> {
  private readonly logger = new Logger(CrimeLogCreatedHandler.name);
  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: CrimeLogCreatedEvent) {
    // ok, first we find last crime

    const thisCrime = await this.playerCrimeLogEntityRepository.findOne({
      id: event.id,
    });

    const frequentCrimesCount = await this.playerCrimeLogEntityRepository
      .createQueryBuilder('pc')
      .select()
      .where('pc.steam_id = :sid', { sid: thisCrime.steam_id })
      .andWhere('pc.handled = false')
      .andWhere(
        'pc.created_at >= :crimeCountStart',
        {
          thisCrimeTime: thisCrime.created_at,
          crimeCountStart: new Date(
            new Date().getTime() - CRIMES_INTERVAL_FOR_MULTIPLY,
          ),
        },
      )
      .getMany();

    // total crimes done within 24 hours
    const punishmentDuration = calcCumulativePunishment(frequentCrimesCount);

    for (const playerCrimeLogEntity of frequentCrimesCount) {
      playerCrimeLogEntity.handled = true;
      await this.playerCrimeLogEntityRepository.save(playerCrimeLogEntity);
    }

    this.logger.log(
      `Punishment: ${punishmentDuration / 1000 / 60} minutes for ${
        thisCrime.steam_id
      }. Reasons: ${frequentCrimesCount.map(t => t.crime)}`,
    );
    await this.applyBan(
      thisCrime.steam_id,
      punishmentDuration,
      thisCrime,
      frequentCrimesCount,
    );
  }

  private async applyBan(
    steam_id: string,
    duration: number,
    crime: PlayerCrimeLogEntity,
    frequentCrimesCount: PlayerCrimeLogEntity[],
  ) {
    let ban = await this.playerBanRepository.findOne({
      steam_id: steam_id,
    });

    if (!ban) {
      ban = new PlayerBan();
      ban.steam_id = steam_id;
      ban.reason = crime.crime;
      ban.endTime = new Date(new Date().getTime() + duration);
      await this.playerBanRepository.save(ban);
    } else if (ban.endTime.getTime() < new Date().getTime()) {
      ban.endTime = new Date(new Date().getTime() + duration);
      ban.reason = crime.crime;
      await this.playerBanRepository.save(ban);
    } else {
      // already banned, need to incrmeent
      ban.endTime = new Date(ban.endTime.getTime() + duration);
      ban.reason = crime.crime;
      await this.playerBanRepository.save(ban);
    }

    this.ebus.publish(
      new BanSystemEvent(
        new PlayerId(steam_id),
        frequentCrimesCount.map(
          t => new BanSystemEntry(t.crime, t.created_at.getTime()),
        ),
        ban.endTime.getTime(),
        duration,
      ),
    );
  }
}
