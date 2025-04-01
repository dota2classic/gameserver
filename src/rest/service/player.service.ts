import { Injectable } from '@nestjs/common';
import { Connection, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import { HeroStatsDto, PlayerHeroPerformance } from 'rest/dto/hero.dto';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';


// TODO: we probably need to orm this shit up
@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    private readonly gsService: GameServerService,
    private readonly connection: Connection,
  ) {}


  async heroStats(
    steam_id: string,
  ): Promise<HeroStatsDto[]> {
    return await this.playerInMatchRepository.query(
      `
select pim."playerId",
       avg(pim.gpm)::float                                                     as gpm,
       avg(pim.xpm)::float                                                     as xpm,
       avg((pim.kills + pim.assists)::float / greatest(pim.deaths, 1))::float  as kda,
       count(*)::int as games,
       avg(pim.last_hits)::float as last_hits,
       avg(pim.denies)::float as denies,
       sum((pim.team = match.winner)::int)::int as wins,
       sum((pim.team != match.winner)::int)::int as loss,
       pim.hero
from player_in_match pim
inner join finished_match match on "matchId" = match.id
where pim."playerId" = $3 and match.matchmaking_mode in ($1, $2)
group by pim.hero, pim."playerId"
`,
      [MatchmakingMode.RANKED, MatchmakingMode.UNRANKED, steam_id],
    );
  }

  async getHeroPlayers(hero: string): Promise<PlayerHeroPerformance[]> {
    const query = `
with players as (select pim."playerId"                  as player,
                        sum((pim.team = m.winner)::int) as wins,
                        avg(pim.level)                  as level,
                        avg(pim.kills)                  as kills,
                        avg(pim.deaths)                 as deaths,
                        avg(pim.assists)                as assists,
                        sum(1)                          as games
                 from player_in_match pim
                          inner join finished_match m on m.id = pim."matchId"
                 where pim.hero = $1
                   and length(pim."playerId") > 2
                   and m.matchmaking_mode in ($2, $3)
                 group by pim."playerId")
select p.player as steam_id,
       p.games::int                                                               as games,
       p.wins::int                                                                as wins,
       p.kills::float                                                             as kills,
       p.deaths::float                                                            as deaths,
       p.assists::float                                                           as assists,
       (((p.kills + p.assists) / greatest(1, p.deaths)) * ((p.wins::float / p.games) ^ 2 * p.games))::int as score
from players p
where p.games > $4
order by score desc`;

    const minGames = 8;
    return await this.connection.query<PlayerHeroPerformance[]>(query, [
      hero,
      MatchmakingMode.UNRANKED,
      MatchmakingMode.RANKED,
      minGames,
    ]);
  }

}
