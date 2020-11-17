import { Injectable } from '@nestjs/common';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { GameServerService } from 'gameserver/gameserver.service';

@Injectable()
export class PlayerService {
  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    private readonly gsService: GameServerService,
  ) {}

  public async getRank(version: Dota2Version, steam_id: string): Promise<number> {
    const p = await this.versionPlayerRepository.findOne({
      steam_id,
      version,
    });

    const season = await this.gsService.getCurrentSeason(version);

    return await this.versionPlayerRepository.query(`
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
`)
  }
}
