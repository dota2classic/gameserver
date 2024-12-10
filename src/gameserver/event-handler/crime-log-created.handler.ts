import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HARD_PUNISHMENT, LIGHT_PUNISHMENT, MEDIUM_PUNISHMENT } from 'gateway/shared-types/timings';
import { BanReason } from 'gateway/shared-types/ban';
import { Logger } from '@nestjs/common';
import { BanSystemEntry, BanSystemEvent } from 'gateway/events/gs/ban-system.event';
import { PlayerId } from 'gateway/shared-types/player-id';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

export const getBasePunishment = (crime: BanReason) => {
  switch (crime) {
    case BanReason.INFINITE_BAN:
      return Infinity;
    case BanReason.GAME_DECLINE:
      return LIGHT_PUNISHMENT;
    case BanReason.LOAD_FAILURE:
      return MEDIUM_PUNISHMENT;
    case BanReason.REPORTS:
      return HARD_PUNISHMENT;
    default:
      return 0;
  }
};

export const countCrimes = (crimes: PlayerCrimeLogEntity[]) => {
  const grouped: Map<BanReason, number> = new Map();
  for (let crime of crimes) {
    grouped.set(crime.crime, +grouped.get(crime.crime) + 1);
  }
  return grouped;
};

@EventsHandler(CrimeLogCreatedEvent)
export class CrimeLogCreatedHandler
  implements IEventHandler<CrimeLogCreatedEvent>
{
  private readonly logger = new Logger(CrimeLogCreatedHandler.name);
  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<PlayerCrimeLogEntity>,
    @InjectRepository(PlayerBanEntity)
    private readonly playerBanRepository: Repository<PlayerBanEntity>,
    private readonly ebus: EventBus,
  ) {}

  async handle(event: CrimeLogCreatedEvent) {
    // ok, first we find last crime

    const thisCrime = await this.playerCrimeLogEntityRepository.findOne({
      where: { id: event.id },
    });

    if (!thisCrime) return;

    // We don't punish for crimes in bots
    if (thisCrime.lobby_type === MatchmakingMode.BOTS) {
      thisCrime.handled = true;
      thisCrime.banTime = 0;
      await this.playerCrimeLogEntityRepository.save(thisCrime);
      this.logger.verbose("Don't punish for crime in bot match", {
        steam_id: thisCrime.steam_id,
        id: thisCrime.id,
        crime: thisCrime.crime,
        lobby_type: thisCrime.lobby_type,
        created_at: thisCrime.created_at,
      });
      return;
    }

    // TODO: make this SQL based with interval
    const frequentCrimesCount = await this.playerCrimeLogEntityRepository
      .createQueryBuilder("pc")
      .select()
      .where("pc.steam_id = :sid", { sid: thisCrime.steam_id })
      .andWhere("pc.created_at >= now() - '24h'::interval") // interval here
      .getMany();

    // total crimes done within 24 hours
    const countedCrimes = countCrimes(frequentCrimesCount);

    let totalPunishmentCount = countedCrimes.get(thisCrime.crime) || 0;
    const basePunishment = getBasePunishment(thisCrime.crime);
    let punishmentDuration = basePunishment * totalPunishmentCount;

    this.logger.log(
      `Punishment: ${punishmentDuration / 1000 / 60} minutes for ${
        thisCrime.steam_id
      }. Total punishment count: ${totalPunishmentCount}`,
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
      where: {
        steam_id: steam_id,
      },
    });

    this.logger.log(`Updating ban time for user`, {
      steam_id,
      duration,
      crime,
    });

    if (!ban) {
      this.logger.log("New ban entity");
      ban = new PlayerBanEntity();
      ban.steam_id = steam_id;
      ban.reason = crime.crime;
      ban.endTime = new Date(new Date().getTime() + duration);
      await this.playerBanRepository.save(ban);
    } else if (ban.endTime.getTime() < new Date().getTime()) {
      this.logger.log("Ban time expired: making now() + duration");
      ban.endTime = new Date(new Date().getTime() + duration);
      ban.reason = crime.crime;
      await this.playerBanRepository.save(ban);
    } else {
      this.logger.log("Ban time is active: making endTime + duration");
      // already banned, need to incrmeent
      ban.endTime = new Date(ban.endTime.getTime() + duration);
      ban.reason = crime.crime;
      await this.playerBanRepository.save(ban);
    }

    this.ebus.publish(
      new BanSystemEvent(
        new PlayerId(steam_id),
        frequentCrimesCount.map(
          (t) => new BanSystemEntry(t.crime, t.created_at.getTime()),
        ),
        ban.endTime.getTime(),
        duration,
      ),
    );
  }
}
