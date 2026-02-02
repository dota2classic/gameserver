import { EventBus, EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { CrimeLogCreatedEvent } from 'gameserver/event/crime-log-created.event';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FIVE_MINUTES, HARD_PUNISHMENT, LIGHT_PUNISHMENT } from 'gateway/shared-types/timings';
import { BanReason } from 'gateway/shared-types/ban';
import { Logger } from '@nestjs/common';
import { BanSystemEntry, BanSystemEvent } from 'gateway/events/gs/ban-system.event';
import { PlayerId } from 'gateway/shared-types/player-id';
import { PlayerBanEntity } from 'gameserver/model/player-ban.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

const ABANDON_PUNISHMENTS_HOURS = [
  1, // 12 hours
  8, // 24 hours
  3 * 24, // 5 days
  7 * 24, // 2 weeks
  14 * 24, // 1 month
];
const hr = 1000 * 60 * 60;

export const getBasePunishment = (crime: BanReason) => {
  switch (crime) {
    case BanReason.INFINITE_BAN:
      return Infinity;
    case BanReason.GAME_DECLINE:
      return LIGHT_PUNISHMENT;
    case BanReason.LOAD_FAILURE:
      return FIVE_MINUTES;
    case BanReason.ABANDON:
      return HARD_PUNISHMENT;
    default:
      return 0;
  }
};

export const getPunishmentCumulativeInterval = (crime: BanReason): string => {
  switch (crime) {
    case BanReason.INFINITE_BAN:
      return "1y";
    case BanReason.GAME_DECLINE:
      return "6h";
    case BanReason.LOAD_FAILURE:
      return "3d";
    case BanReason.ABANDON:
      return "30d";
    default:
      return "1m";
  }
};

export const countCrimes = (crimes: PlayerCrimeLogEntity[]) => {
  const grouped: Map<BanReason, number> = new Map();
  for (let crime of crimes) {
    grouped.set(crime.crime, (grouped.get(crime.crime) || 0) + 1);
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
  ) {
    this.playerCrimeLogEntityRepository
      .find({
        where: {
          handled: false,
        },
      })
      .then((unhandled) =>
        Promise.all(
          unhandled.map((it) => this.handle(new CrimeLogCreatedEvent(it.id))),
        ),
      )
      .then((proms) => {
        this.logger.log(
          `Initial catching up in crimes finished, ${proms.length} crimes handled`,
        );
      });
  }

  async handle(event: CrimeLogCreatedEvent) {
    // ok, first we find last crime

    const thisCrime = await this.playerCrimeLogEntityRepository.findOne({
      where: { id: event.id },
    });

    if (!thisCrime) return;

    // We don't punish for crimes in bots
    if (
      thisCrime.lobby_type === MatchmakingMode.BOTS ||
      thisCrime.lobby_type === MatchmakingMode.LOBBY ||
      thisCrime.lobby_type == MatchmakingMode.SOLOMID ||
      thisCrime.lobby_type == MatchmakingMode.TOURNAMENT ||
      thisCrime.lobby_type == MatchmakingMode.TURBO
    ) {
      thisCrime.handled = true;
      thisCrime.banTime = 0;
      await this.playerCrimeLogEntityRepository.save(thisCrime);
      this.logger.verbose("Don't punish for crime in bot/lobby match", {
        steam_id: thisCrime.steam_id,
        id: thisCrime.id,
        crime: thisCrime.crime,
        lobby_type: thisCrime.lobby_type,
        created_at: thisCrime.created_at,
      });
      return;
    }

    const cumInterval = getPunishmentCumulativeInterval(thisCrime.crime);

    this.logger.log(`Cumulative interval for crime is ${cumInterval}`);

    const frequentCrimesCount = await this.playerCrimeLogEntityRepository
      .createQueryBuilder("pc")
      .select()
      .where("pc.steam_id = :sid", { sid: thisCrime.steam_id })
      .andWhere(`pc.created_at >= now() - :cum_interval::interval`, {
        cum_interval: cumInterval,
      }) // interval here
      .andWhere({
        handled: true,
      })
      .andWhere(`pc."banTime" > 0`)
      .getMany();

    // total crimes done within 24 hours
    const countedCrimes = countCrimes(frequentCrimesCount);

    // We do `+1` because it doesn't count current crime, but we want to
    let totalPunishmentCount = (countedCrimes.get(thisCrime.crime) || 0) + 1;

    let punishmentDuration: number;
    if (thisCrime.crime === BanReason.ABANDON) {
      // Use predefined punishments
      const punishmentIdx = Math.min(
        Math.max(0, totalPunishmentCount - 1),
        ABANDON_PUNISHMENTS_HOURS.length - 1,
      );
      punishmentDuration = ABANDON_PUNISHMENTS_HOURS[punishmentIdx] * hr;
    } else {
      const basePunishment = getBasePunishment(thisCrime.crime);
      punishmentDuration = basePunishment * totalPunishmentCount;
    }


    if(thisCrime.lobby_type === MatchmakingMode.HIGHROOM) {
      punishmentDuration *= 3;
    }

    this.logger.log(
      `Punishment: ${punishmentDuration / 1000 / 60} minutes for ${
        thisCrime.steam_id
      }. Total punishment count: ${totalPunishmentCount}`,
    );
    thisCrime.banTime = punishmentDuration;
    thisCrime.handled = true;
    await this.playerCrimeLogEntityRepository.save(thisCrime);

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
