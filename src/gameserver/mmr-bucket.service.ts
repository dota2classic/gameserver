import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface FantasyBucket {
  maxMmr: number;
  fantasy: number;
}

@Injectable()
export class MmrBucketService {
  public static BUCKET_SIZE = 500;

  constructor(private readonly datasource: DataSource) {}

  public async getPlayerInMatchFpm(steamId: string, matchId: number) {
    const d = await this.datasource.query<{ fpm: number }[]>(
      `
       select
    (60 * fantasy_score(pim) / fm.duration)::numeric as fpm 
  from
    player_in_match pim
  inner join finished_match fm on
    fm.id = pim."matchId"
  inner join version_player vp on vp.steam_id = pim."playerId"
  where
    pim."playerId" = $1
    and fm.matchmaking_mode in (0, 1)
    and fm.duration > 0 and pim."matchId" = $2
      `,
      [steamId, matchId],
    );
    return d[0].fpm;
  }


  public async getPlayerFpmInSeason(steamId: string) {
    const d = await this.datasource.query<{ fpm: number }[]>(
      `
      select
        avg(60 * fantasy_score(pim) / fm.duration)::numeric as fpm
      from
        player_in_match pim
      inner join finished_match fm on
        fm.id = pim."matchId"
      inner join version_player vp on vp.steam_id = pim."playerId"
      where
        pim."playerId" = $1
        and fm.matchmaking_mode in (0, 1)
        and fm.duration > 0
        and fm.timestamp >= (
            select
                gs.start_timestamp
            from
                game_season gs
            order by
                gs.start_timestamp desc
            limit 1)
      `,
      [steamId],
    );
    return d[0].fpm;
  }

  /**
   * @returns coefficient - how much better player's fpm is for his bucket. if K < 1: plays worse than actual mmr, if K > 1: plays better
   * @param playerMmr - player's mmr
   * @param playerAvgFpm player's avg fantasy per minute
   */
  public async additionalPerformanceCoefficient(
    playerMmr: number,
    playerAvgFpm: number,
  ): Promise<number> {
    const playerBucket = await this.getBucketForMmr(playerMmr);
    if (!playerBucket) return 1.0;

    if (playerBucket.fantasy === 0) return 1.0;

    const relPerf = playerAvgFpm / playerBucket.fantasy;
    // Clamp to [-4, 4]
    if (relPerf > 4) {
      return 4;
    }
    if (relPerf < -4) {
      return -4;
    }
    return relPerf;
  }

  async getFantasyBuckets(): Promise<FantasyBucket[]> {
    return (
      await this.datasource.query<
        {
          mmr_bucket: number;
          fpm: number;
          matches: number;
        }[]
      >(
        `
    with fantasy_history as (
      select
      fm.id,
        pim."playerId" as steam_id,
      vp.mmr as mmr,
      pim.hero,
      fm.duration,
      fantasy_score(pim) as fp
    from
        player_in_match pim
    inner join finished_match fm on
        fm.id = pim."matchId"
    inner join version_player vp on
        vp.steam_id = pim."playerId"
    where
        fm.matchmaking_mode in (0, 1)
        and fm.duration > 0
        and fm.timestamp >= (
            select
                gs.start_timestamp
            from
                game_season gs
            order by
                gs.start_timestamp desc
            limit 1)
    )
    select
        (fh.mmr / $1)::int as mmr_bucket,
        avg(fh.fp / fh.duration * 60)::numeric as fpm,
        count(fh.id)::int as matches
    from
        fantasy_history fh
    group by
        1
    having 
        count(fh.id) > 100
    `,
        [MmrBucketService.BUCKET_SIZE],
      )
    )
      .map((it) => ({
        maxMmr: (it.mmr_bucket + 1) * MmrBucketService.BUCKET_SIZE,
        fantasy: it.fpm,
      }))
      .sort((a, b) => a.maxMmr - b.maxMmr);
  }

  private async getBucketForMmr(
    mmr: number,
  ): Promise<FantasyBucket | undefined> {
    const buckets = await this.getFantasyBuckets();

    if (buckets.length === 0) return undefined;

    return buckets.find(
      (bucket) =>
        mmr > bucket.maxMmr - MmrBucketService.BUCKET_SIZE &&
        mmr <= bucket.maxMmr,
    );
  }
}
