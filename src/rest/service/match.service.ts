import { Injectable } from '@nestjs/common';
import { Connection, In, Repository } from 'typeorm';
import { measure } from 'util/measure';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { CommandBus } from '@nestjs/cqrs';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MmrChangeLogEntity } from 'gameserver/model/mmr-change-log.entity';

@Injectable()
export class MatchService {
  constructor(
    private readonly connection: Connection,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<
      FinishedMatchEntity
    >,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<
      PlayerInMatchEntity
    >,
    private readonly cbus: CommandBus,
    @InjectRepository(MmrChangeLogEntity)
    private readonly mmrChangeLogEntityRepository: Repository<MmrChangeLogEntity>,
  ) {}

  @measure("getMatchPage")
  public async getMatchPage(
    page: number,
    perPage: number,
    mode?: MatchmakingMode,
  ): Promise<[FinishedMatchEntity[], number]> {
    const condition = !mode
      ? {}
      : {
          matchmaking_mode: mode,
        };

    // This query has to use take() and skip(), because we are mapping all PIMs
    const items = this.finishedMatchEntityRepository
      .createQueryBuilder("fm")
      .leftJoinAndSelect("fm.players", "players")
      .where(condition)
      .take(perPage)
      .skip(perPage * page)
      .orderBy({ "fm.timestamp": "DESC" })
      .getMany();

    const count = this.finishedMatchEntityRepository
      .createQueryBuilder("fm")
      .where(condition)
      .getCount();

    return Promise.combine([items, count]);
  }

  @measure("getMatchPage:fastest")
  public async getMatchPageFastest(
    page: number,
    perPage: number,
    mode?: MatchmakingMode,
  ): Promise<[FinishedMatchEntity[], number]> {
    const condition = !mode
      ? {}
      : {
          matchmaking_mode: mode,
        };

    const cond = mode !== undefined ? `WHERE fm.matchmaking_mode = $3` : ''
    const req: {
      fm_id: number;
    }[] = await this.finishedMatchEntityRepository.query(
      `
      SELECT fm.id AS "fm_id"
      FROM "finished_match" fm
      ${cond}
      ORDER BY "fm"."timestamp" DESC, "fm"."id" ASC
      LIMIT $1 OFFSET $2
`,
      [perPage, perPage * page, mode],
    );

    // This query has to use take() and skip(), because we are mapping all PIMs
    // BUT: we don't really need inner select and pim and stuff for id list
    const items = this.finishedMatchEntityRepository
      .createQueryBuilder("fm")
      .leftJoinAndSelect("fm.players", "players")
      .where(condition)
      .andWhere({ id: In(req.map(d => d.fm_id)) })
      .orderBy({ "fm.timestamp": "DESC" })
      .getMany();

    const count = this.finishedMatchEntityRepository
      .createQueryBuilder("fm")
      .where(condition)
      .getCount();

    return Promise.combine([items, count]);
  }

  // http_req_waiting...............: avg=218.18ms min=46.31ms med=176.7ms  max=1.07s   p(90)=348.67ms p(95)=641.38ms
  // http_reqs......................: 1695   80.493324/s
  @measure("playerMatches:new")
  public async playerMatchesNew(
    steam_id: string,
    page: number,
    perPage: number,
    mode?: MatchmakingMode,
    hero?: string,
  ): Promise<[FinishedMatchEntity[], number]> {
    const query = this.finishedMatchEntityRepository
      .createQueryBuilder("fm")
      .leftJoinAndSelect("fm.players", "players")
      .where("players.playerId = :steam_id", { steam_id });

    if (mode !== undefined) {
      query.andWhere(`fm.matchmaking_mode = :mode`, { mode });
    }
    if (hero !== undefined) {
      query.andWhere(`players.hero = :hero`, { hero });
    }

    const pims = query
      .take(perPage)
      .skip(perPage * page)
      .orderBy({ "fm.timestamp": "DESC" })
      .getMany();

    const total = query.getCount();

    return Promise.combine([pims, total]);
  }

  async manuallyTriggerMmrForMatch(matchId: number) {
    // await this.mmrChangeLogEntityRepository.delete({ matchId : matchId });

    const m = await this.finishedMatchEntityRepository.findOne({
      where: { id: matchId },
    });
    const winners = m.players
      .filter(t => t.team === m.winner)
      .map(it => new PlayerId(it.playerId));
    const losers = m.players
      .filter(t => t.team !== m.winner)
      .map(it => new PlayerId(it.playerId));
    await this.cbus.execute(new ProcessRankedMatchCommand(matchId, winners, losers, m.matchmaking_mode));
  }
}
