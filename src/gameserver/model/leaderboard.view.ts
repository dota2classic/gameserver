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
    count(*)::int as games,
    (count(*) filter (
where
    fm.timestamp >= cs.start_timestamp))::int as season_games,
    (count(*) filter (
where
    fm.winner = plr.team))::int as wins,
    coalesce(vp.mmr,
    -1) as mmr
from
    player_in_match plr
inner join current_season cs on
    true
left join version_player vp on
    plr."playerId" = vp.steam_id
    and vp.season_id = cs.id
inner join finished_match fm on
    plr."matchId" = fm.id
    and fm.matchmaking_mode in (0, 1)
group by
    plr."playerId",
    vp.mmr)
select
    p.steam_id,
    p.wins,
    p.games,
    p.season_games,
    p.mmr as mmr,
    avg(pim.kills)::float as kills,
    avg(pim.deaths)::float as deaths,
    avg(pim.assists)::float as assists,
    sum(m.duration)::int as play_time,
    (row_number() over (
order by
    p.mmr desc,
    p.games desc))::int as rank
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
    p.season_games,
    p.wins
order by
    rank asc,
    games desc
`,
  materialized: true,
})
export class LeaderboardView {
  @Index({ unique: true })
  @ViewColumn({ name: "steam_id"})
  steamId: string;

  @ViewColumn()
  rank: number | null;

  @Index()
  @ViewColumn()
  mmr: number;

  @Index()
  @ViewColumn()
  games: number;

  @ViewColumn({ name: "season_games"})
  seasonGames: number;

  @ViewColumn()
  wins: number;

  @ViewColumn()
  kills: number;
  @ViewColumn()
  deaths: number;
  @ViewColumn()
  assists: number;

  @ViewColumn({ name: "play_time"})
  playtime: number;
}
