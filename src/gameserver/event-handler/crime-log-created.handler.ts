import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { inspect } from 'util';
import {
  calcCumulativePunishment,
  CRIMES_INTERVAL_FOR_MULTIPLY,
  HARD_PUNISHMENT,
  LIGHT_PUNISHMENT,
  MAX_TIME_FOR_PUNISHMENT_MULTIPLY,
} from 'gateway/shared-types/timings';
import { PlayerBan } from 'gameserver/entity/PlayerBan';

@EventsHandler(CrimeLogCreatedEvent)
export class CrimeLogCreatedHandler
  implements IEventHandler<CrimeLogCreatedEvent> {
  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    @InjectRepository(PlayerBan)
    private readonly playerBanRepository: Repository<PlayerBan>,
  ) {}

  async handle(event: CrimeLogCreatedEvent) {
    // ok, first we find last crime

    const thisCrime = await this.playerCrimeLogEntityRepository.findOne({
      id: event.id,
    });

    const frequentCrimesCount = await this.playerCrimeLogEntityRepository
      .createQueryBuilder('pc')
      .where('pc.steam_id = :sid', { sid: thisCrime.steam_id })
      .andWhere(
        'pc.created_at < :thisCrimeTime and pc.created_at > :crimeCountStart',
        {
          thisCrimeTime: thisCrime.created_at,
          crimeCountStart: new Date(
            new Date().getTime() - CRIMES_INTERVAL_FOR_MULTIPLY,
          ),
        },
      )
      .getCount();


    // total crimes done within 24 hours
    const punishmentDuration = calcCumulativePunishment(frequentCrimesCount);

    console.log(`Punishment: ${punishmentDuration / 1000 / 60} minutes`);
    await this.applyBan(thisCrime.steam_id, punishmentDuration, thisCrime);
  }

  private async applyBan(
    steam_id: string,
    duration: number,
    crime: PlayerCrimeLogEntity,
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
      await this.playerBanRepository.save(ban);
    } else {
      // already banned, need to incrmeent
      ban.endTime = new Date(ban.endTime.getTime() + duration);
      await this.playerBanRepository.save(ban);
    }
  }
}
