import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  materialized: true,
  name: "mmr_bucket_view",
  expression: `
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
        (fh.mmr / 500)::int as mmr_bucket,
        avg(fh.fp / fh.duration * 60)::numeric as fpm,
        count(fh.id)::int as matches
    from
        fantasy_history fh
    group by
        1
    having 
        count(fh.id) > 100
    `
})
export class MmrBucketView {
  @ViewColumn({ name: "mmr_bucket"})
  mmrBucket: number;

  @ViewColumn({ name: "fpm"})
  fpm: number;

  @ViewColumn({ name: "matches"})
  matches: number;

}
