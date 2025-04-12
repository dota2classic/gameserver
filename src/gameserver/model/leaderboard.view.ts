import { Index, ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression: `
select
    vp.steam_id,
    vp.season_id as season_id,
    sum(count(1)) over (partition by vp.steam_id, vp.season_id) as games,
    sum(count(1) filter (where pim.team = fm.winner)) over (partition by vp.steam_id, vp.season_id) as wins,
    sum(count(1) filter (where pim.abandoned)) over (partition by vp.steam_id, vp.season_id) as abandons,
    vp.mmr as mmr,
    avg(avg(pim.kills)) over (partition by vp.season_id, vp.steam_id) as kills,
    avg(avg(pim.deaths)) over (partition by vp.season_id, vp.steam_id) as deaths,
    avg(avg(pim.assists)) over (partition by vp.season_id, vp.steam_id) as assists,
    sum(sum(fm.duration)) over (partition by vp.season_id, vp.steam_id) as play_time,
    row_number() over (partition by vp.season_id order by vp.mmr desc) as rank
from
    version_player vp
inner join 
    game_season gs on gs.id = vp.season_id
inner join
    player_in_match pim on pim."playerId" = vp.steam_id
inner join 
    finished_match fm on pim."matchId" = fm.id and fm.matchmaking_mode in (0, 1) and fm.season_id = vp.season_id
group by
    vp.steam_id,
    vp.season_id
order by
    rank asc,
    games desc;
`,
  materialized: true,
})
@Index(['steamId', 'seasonId'], { unique: true })
export class LeaderboardView {
  @ViewColumn({ name: "steam_id"})
  steamId: string;

  @ViewColumn({ name: "season_id"})
  seasonId: number;

  @ViewColumn()
  rank: number | null;

  @Index()
  @ViewColumn()
  mmr: number;

  @Index()
  @ViewColumn()
  games: number;

  @ViewColumn()
  wins: number;

  @ViewColumn()
  abandons: number;

  @ViewColumn()
  kills: number;
  @ViewColumn()
  deaths: number;
  @ViewColumn()
  assists: number;

  @ViewColumn({ name: "play_time"})
  playtime: number;
}
