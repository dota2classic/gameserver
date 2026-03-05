import { EventBus, EventsHandler, IEventHandler } from "@nestjs/cqrs";
import { CrimeLogCreatedEvent } from "gameserver/event/crime-log-created.event";
import { PlayerCrimeLogEntity } from "gameserver/model/player-crime-log.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { LIGHT_PUNISHMENT } from "gateway/shared-types/timings";
import { BanReason } from "gateway/shared-types/ban";
import { Logger } from "@nestjs/common";
import { BanSystemEntry, BanSystemEvent } from "gateway/events/gs/ban-system.event";
import { PlayerId } from "gateway/shared-types/player-id";
import { PlayerBanEntity } from "gameserver/model/player-ban.entity";
import { MatchmakingMode } from "gateway/shared-types/matchmaking-mode";

const hr = 1000 * 60 * 60;
const min = 1000 * 60;

const ABANDON_PUNISHMENTS_MS = [
  1 * hr, // 1st offense: 1 hour
  8 * hr, // 2nd:         8 hours
  3 * 24 * hr, // 3rd:         3 days
  7 * 24 * hr, // 4th:         7 days
  14 * 24 * hr, // 5th+:       14 days
];

const LOAD_FAILURE_PUNISHMENTS_MS = [
  10 * min, // 1st offense
  30 * min, // 2nd
  1 * hr, // 3rd
  2 * hr, // 4th
  6 * hr, // 5th
  12 * hr, // 6th
  24 * hr, // 7th
  48 * hr, // 8th+
];

const EXEMPT_LOBBY_TYPES = new Set([
  MatchmakingMode.BOTS,
  MatchmakingMode.LOBBY,
  MatchmakingMode.SOLOMID,
  MatchmakingMode.TOURNAMENT,
  MatchmakingMode.TURBO,
]);

export const getPunishmentCumulativeInterval = (crime: BanReason): string => {
  switch (crime) {
    case BanReason.INFINITE_BAN:
      return "1y";
    case BanReason.GAME_DECLINE:
      return "6h";
    case BanReason.LOAD_FAILURE:
      return "7d";
    case BanReason.ABANDON:
      return "30d";
    default:
      return "1m";
  }
};

export const countCrimes = (
  crimes: PlayerCrimeLogEntity[],
): Map<BanReason, number> => {
  const grouped: Map<BanReason, number> = new Map();
  for (const crime of crimes) {
    grouped.set(crime.crime, (grouped.get(crime.crime) || 0) + 1);
  }
  return grouped;
};

const clampedIndex = (arr: number[], n: number) =>
  Math.min(n - 1, arr.length - 1);

const computePunishment = (crime: BanReason, offenseCount: number): number => {
  switch (crime) {
    case BanReason.ABANDON:
      return ABANDON_PUNISHMENTS_MS[
        clampedIndex(ABANDON_PUNISHMENTS_MS, offenseCount)
      ];
    case BanReason.LOAD_FAILURE:
      return offenseCount < 1
        ? 0
        : LOAD_FAILURE_PUNISHMENTS_MS[
            clampedIndex(LOAD_FAILURE_PUNISHMENTS_MS, offenseCount)
          ];
    case BanReason.GAME_DECLINE:
      return LIGHT_PUNISHMENT * offenseCount;
    case BanReason.INFINITE_BAN:
      return Infinity;
    default:
      return 0;
  }
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
      .find({ where: { handled: false } })
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
    const thisCrime = await this.playerCrimeLogEntityRepository.findOne({
      where: { id: event.id },
    });

    if (!thisCrime) return;

    if (EXEMPT_LOBBY_TYPES.has(thisCrime.lobby_type)) {
      await this.dismissCrime(thisCrime);
      return;
    }

    const cumInterval = getPunishmentCumulativeInterval(thisCrime.crime);

    this.logger.log(`Cumulative interval for crime is ${cumInterval}`);

    const priorCrimes = await this.playerCrimeLogEntityRepository
      .createQueryBuilder("pc")
      .select()
      .where("pc.steam_id = :sid", { sid: thisCrime.steam_id })
      .andWhere(`pc.created_at >= now() - :cum_interval::interval`, {
        cum_interval: cumInterval,
      })
      .andWhere({ handled: true })
      .andWhere(`pc."banTime" > 0`)
      .getMany();

    // +1 to include the current crime
    const offenseCount =
      (countCrimes(priorCrimes).get(thisCrime.crime) || 0) + 1;

    let punishmentDuration = computePunishment(thisCrime.crime, offenseCount);

    if (thisCrime.lobby_type === MatchmakingMode.HIGHROOM) {
      punishmentDuration *= 3;
    }

    this.logger.log(
      `Punishment: ${punishmentDuration / min} minutes for ${thisCrime.steam_id}. Offense count: ${offenseCount}`,
    );

    thisCrime.banTime = punishmentDuration;
    thisCrime.handled = true;
    await this.playerCrimeLogEntityRepository.save(thisCrime);

    await this.applyBan(
      thisCrime.steam_id,
      punishmentDuration,
      thisCrime,
      priorCrimes,
    );
  }

  private async dismissCrime(crime: PlayerCrimeLogEntity) {
    crime.handled = true;
    crime.banTime = 0;
    await this.playerCrimeLogEntityRepository.save(crime);
    this.logger.verbose("Don't punish for crime in exempt lobby type", {
      steam_id: crime.steam_id,
      id: crime.id,
      crime: crime.crime,
      lobby_type: crime.lobby_type,
      created_at: crime.created_at,
    });
  }

  private async applyBan(
    steam_id: string,
    duration: number,
    crime: PlayerCrimeLogEntity,
    priorCrimes: PlayerCrimeLogEntity[],
  ) {
    let ban = await this.playerBanRepository.findOne({ where: { steam_id } });

    this.logger.log(`Updating ban time for user`, {
      steam_id,
      duration,
      crime,
    });

    const now = Date.now();
    if (!ban) {
      this.logger.log("New ban entity");
      ban = new PlayerBanEntity();
      ban.steam_id = steam_id;
      ban.reason = crime.crime;
      ban.endTime = new Date(now + duration);
    } else if (ban.endTime.getTime() < now) {
      this.logger.log("Ban time expired: making now() + duration");
      ban.endTime = new Date(now + duration);
      ban.reason = crime.crime;
    } else {
      this.logger.log("Ban time is active: extending endTime by duration");
      ban.endTime = new Date(ban.endTime.getTime() + duration);
      ban.reason = crime.crime;
    }

    await this.playerBanRepository.save(ban);

    this.ebus.publish(
      new BanSystemEvent(
        new PlayerId(steam_id),
        priorCrimes.map(
          (t) => new BanSystemEntry(t.crime, t.created_at.getTime()),
        ),
        ban.endTime.getTime(),
        duration,
      ),
    );
  }
}
