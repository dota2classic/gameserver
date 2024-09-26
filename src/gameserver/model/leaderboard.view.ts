import { Index, ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  expression: `with cte as (select plr."playerId"                                                                   as steam_id,
                    count(*)::int                                                                    as any_games,
                    sum((m.matchmaking_mode in (0, 1))::int)::int                                    as games,
                    sum((m.winner = plr.team and m.matchmaking_mode in (0, 1))::int)::int            as wins,
                    sum((m.matchmaking_mode = 0 and m.timestamp > now() - '14 days'::interval)::int) as recent_ranked_games,
                    coalesce(p.mmr, -1)                                                              as mmr
             from player_in_match plr
                      left join version_player p on plr."playerId" = p.steam_id
                      inner join finished_match m on plr."matchId" = m.id
             group by plr."playerId", p.mmr)
select p.steam_id,
       p.wins,
       p.games,
       p.any_games,
       (case when p.mmr > 0 and p.recent_ranked_games > 0 then p.mmr else null end) as mmr,
       avg(pim.kills)::float                                                        as kills,
       avg(pim.deaths)::float                                                       as deaths,
       avg(pim.assists)::float                                                      as assists,
       sum(m.duration)::int                                                         as play_time,
       sum((m.matchmaking_mode = 0)::int)                                           as ranked_games,
       (case
            when p.recent_ranked_games > 0
                then row_number()
                     over ( partition by
                             p.recent_ranked_games >
                             0 order by p.mmr desc
                         )
           end)::int                                                                as rank
from cte p
         inner join player_in_match pim on pim."playerId" = p.steam_id
         inner join finished_match m on pim."matchId" = m.id
group by p.steam_id, p.recent_ranked_games, p.mmr, p.games, p.wins, p.any_games
order by rank, games desc`,
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

  @Index()
  @ViewColumn()
  games: number;

  @ViewColumn()
  ranked_games: number;

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
