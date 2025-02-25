import { Index, ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression: `
with current_season as (
select
    *
from
    game_season gs
order by
    gs.start_timestamp desc
limit 1),
cte as (
select
    plr."playerId" as steam_id,
    count(*)::int as any_games,
    sum((fm.winner = plr.team)::int)::int as bot_wins,
    sum((fm.matchmaking_mode in (0, 1))::int)::int as games,
    sum((fm.winner = plr.team and fm.matchmaking_mode in (0, 1))::int)::int as wins,
    coalesce(vp.mmr,
    -1) as mmr
from
    player_in_match plr
inner join current_season cs on true
left join version_player vp on
    plr."playerId" = vp.steam_id and vp.season_id = cs.id
inner join finished_match fm on
    plr."matchId" = fm.id
group by
    plr."playerId",
    vp.mmr)
select
    p.steam_id,
    p.wins,
    p.games,
    p.any_games,
    p.bot_wins,
    p.mmr as mmr,
    avg(pim.kills)::float as kills,
    avg(pim.deaths)::float as deaths,
    avg(pim.assists)::float as assists,
    sum(m.duration)::int as play_time,
    sum((m.matchmaking_mode in (0, 1))::int) as ranked_games,
    (row_number() over (
order by
    p.mmr desc, p.games DESC))::int as rank
from
    cte p
inner join player_in_match pim on
    pim."playerId" = p.steam_id
inner join finished_match m on
    pim."matchId" = m.id
group by
    p.steam_id,
    p.mmr,
    p.games,
    p.wins,
    p.any_games,
    p.bot_wins
order by
    rank,
    games desc`,
  materialized: true,
})
export class LeaderboardView {
  @Index({ unique: true })
  @ViewColumn()
  steam_id: string;

  @ViewColumn()
  rank: number | null;

  @Index()
  @ViewColumn()
  mmr: number;

  @ViewColumn()
  any_games: number;

  @ViewColumn()
  bot_wins: number;

  @Index()
  @ViewColumn()
  games: number;

  @ViewColumn()
  wins: number;

  @ViewColumn()
  kills: number;
  @ViewColumn()
  deaths: number;
  @ViewColumn()
  assists: number;

  @ViewColumn()
  play_time: number;
}
