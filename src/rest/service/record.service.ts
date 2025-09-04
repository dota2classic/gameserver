import { Injectable } from '@nestjs/common';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';
import { PlayerDailyRecord } from 'rest/dto/record.dto';

export enum PlayerRecordType {
  KILLS = "KILLS",
  KDA = "KDA",
  ASSISTS = "ASSISTS",
  DEATHS = "DEATHS",

  LAST_HITS = "LAST_HITS",
  DENIES = "DENIES",

  GPM = "GPM",
  XPM = "XPM",

  NETWORTH = "NETWORTH",

  TOWER_DAMAGE = "TOWER_DAMAGE",
  HERO_DAMAGE = "HERO_DAMAGE",
  HERO_HEALING = "HERO_HEALING",
}

export enum RecordTimespan {
  OVERALL,
  SEASON,
  MONTHLY,
  DAY,
}

export interface RecordEntry {
  type: PlayerRecordType;
  steamId: string;
  match?: FinishedMatchEntity;
}

@Injectable()
export class RecordService {
  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
    private readonly datasource: DataSource,
  ) {}

  public async getPlayerRecords(span: RecordTimespan, steamId?: string) {
    return Promise.all([
      this.getMostFactory(
        span,
        PlayerRecordType.KDA,
        "MAX((pim.kills + pim.assists) / GREATEST(pim.deaths, 1))",
        steamId,
      ),

      this.getMostFactory(
        span,
        PlayerRecordType.KILLS,
        "max(pim.kills)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.DEATHS,
        "max(pim.deaths)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.ASSISTS,
        "max(pim.assists)",
        steamId,
      ),

      this.getMostFactory(
        span,
        PlayerRecordType.LAST_HITS,
        "max(pim.last_hits)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.DENIES,
        "max(pim.denies)",
        steamId,
      ),

      this.getMostFactory(span, PlayerRecordType.GPM, "max(pim.gpm)", steamId),
      this.getMostFactory(span, PlayerRecordType.XPM, "max(pim.xpm)", steamId),

      this.getMostFactory(
        span,
        PlayerRecordType.NETWORTH,
        "max(pim.gold)",
        steamId,
      ),

      this.getMostFactory(
        span,
        PlayerRecordType.TOWER_DAMAGE,
        "max(pim.tower_damage)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.HERO_DAMAGE,
        "max(pim.hero_damage)",
        steamId,
      ),
      this.getMostFactory(
        span,
        PlayerRecordType.HERO_HEALING,
        "max(pim.hero_healing)",
        steamId,
      ),
    ]);
  }

  public async dailyPlayerRecords() {
    return this.datasource
      .createQueryBuilder()
      .select('"playerId"', "steam_id")
      .addSelect("sum(mcle.change)", "mmr_change")
      .addSelect("count(*)", "games")
      .addSelect("count(*) filter (where mcle.winner)", "wins")
      .addSelect("count(*) filter (where not mcle.winner)", "loss")
      .from<PlayerDailyRecord>(MmrChangeLogEntity, "mcle")
      .groupBy("steam_id")
      .getMany();
  }

  private async getMostFactory(
    span: RecordTimespan,
    type: PlayerRecordType,
    condition: string,
    steamId?: string,
  ): Promise<RecordEntry> {
    let timeCondition: string | object;
    switch (span) {
      case RecordTimespan.OVERALL:
        timeCondition = "true";
        break;
      case RecordTimespan.SEASON:
        timeCondition = `fm.timestamp >= (
            select
                gs.start_timestamp::date
            from
                game_season gs
            order by
                gs.start_timestamp desc
            limit 1)`;
        break;
      case RecordTimespan.MONTHLY:
        timeCondition = `extract(YEAR FROM fm.timestamp) = extract(YEAR FROM now()) and extract(MONTH FROM fm.timestamp) = extract(MONTH FROM now())`;
        break;
      case RecordTimespan.DAY:
        timeCondition = `fm.timestamp::date = now()::date`;
    }

    let pimJoin = 'pim."matchId" = fm.id';
    if (steamId) {
      pimJoin += ` and pim."playerId" = '${steamId}'`;
    }

    const d = await this.datasource
      .createQueryBuilder()
      .addSelect([
        "fm.id as fm_id",
        'pim."playerId" as steam_id',
        `${condition} as mk`,
      ])
      .from("finished_match", "fm")
      .innerJoin("player_in_match", "pim", pimJoin)
      .where("fm.matchmaking_mode in (:...modes)", {
        modes: [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED],
      })
      .andWhere(timeCondition)
      .groupBy('fm.id, pim."playerId"')
      .orderBy("3", "DESC", "NULLS LAST")
      .limit(1)
      .getRawOne<{ fm_id: number; steam_id: string; mk: number }>();

    if (!d) {
      return {
        steamId: steamId,
        type: type,
        match: undefined,
      };
    }

    const fm = await this.finishedMatchEntityRepository.findOne({
      where: { id: d.fm_id },
      relations: ["players"],
    });

    return {
      type,
      match: fm,
      steamId: d.steam_id,
    };
  }
}
