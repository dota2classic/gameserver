import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    private readonly gsService: GameServerService,
  ) {}

  public async getRank(
    version: Dota2Version,
    steam_id: string,
  ): Promise<number> {
    const p = await this.versionPlayerRepository.findOne({
      steam_id,
      version,
    });

    const season = await this.gsService.getCurrentSeason(version);

    const rank = await this.versionPlayerRepository.query(`
        with players as (select p.steam_id, p.mmr, count(pim) as games
                 from version_player p
                          left outer join player_in_match pim
                          inner join match m on pim."matchId" = m.id
                                     on p.steam_id = pim."playerId" and m.timestamp > '${season.start_timestamp.toUTCString()}' and
                                        m.type = ${MatchmakingMode.RANKED}
                 group by p.steam_id, p.mmr)
        select count(*)
        from players p
        where p.mmr > ${p.mmr}
        and p.games > 0
`);

    return parseInt(rank[0].count);
  }

  public async gamesPlayed(
    steam_id: string,
    mode?: MatchmakingMode,
  ): Promise<number> {
    if (mode === undefined) {
      return this.playerInMatchRepository.count({
        playerId: steam_id,
      });
    }
    return this.playerInMatchRepository.count({
      where: {
        match: {
          type: mode,
        },
        playerId: steam_id,
      },
    });
  }

  async winrate(steam_id: string, mode: MatchmakingMode) {
    const wins = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join match m on pim."matchId" = m.id
where m.type = ${mode} and pim."playerSteamId" = '${steam_id}' and m.radiant_win = case pim.team when 2 then true else false end`)
    )[0].wins;

    const loss: number = (
      await this.playerInMatchRepository.query(`
select count(*) as wins
from player_in_match pim
         inner join match m on pim."matchId" = m.id
where m.type = ${mode} and pim."playerSteamId" = '${steam_id}' and m.radiant_win != case pim.team when 2 then true else false end`)
    )[0].wins;

    return wins / loss;
  }
}
