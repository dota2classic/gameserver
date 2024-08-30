import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { LessThanOrEqual, Repository } from 'typeorm';
import { GameSeason } from 'gameserver/entity/GameSeason';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { PlayerId } from 'gateway/shared-types/player-id';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

@Injectable()
export class GameServerService {
  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(GameSeason)
    private readonly gameSeasonRepository: Repository<GameSeason>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    // @InjectRepository(Match)
    // private readonly matchRepository: Repository<Match>,
    // @InjectRepository(FinishedMatch)
    // private readonly finishedMatchRepository: Repository<FinishedMatch>,
  ) {


    // this.migrateShit();
  }

  // public async migrateShit() {
  //   const matches = await this.matchRepository.find({});
  //
  //   const chunkSize = 256;
  //
  //   for(let i = 0; i < Math.ceil(matches.length / chunkSize); i++){
  //     const slice = matches.slice(i * chunkSize, (i + 1) * chunkSize);
  //
  //     const newMatches: FinishedMatch[] = slice.map(m1 => {
  //       const m2 = new FinishedMatch();
  //       m2.id = m1.id;
  //       m2.server = m1.server;
  //       m2.matchmaking_mode = m1.type;
  //       switch (m1.type) {
  //         case MatchmakingMode.RANKED:
  //           m2.game_mode = Dota_GameMode.RANKED_AP;
  //           break;
  //         case MatchmakingMode.UNRANKED:
  //           m2.game_mode = Dota_GameMode.ALLPICK;
  //           break;
  //         case MatchmakingMode.SOLOMID:
  //           m2.game_mode = Dota_GameMode.SOLOMID;
  //           break;
  //         case MatchmakingMode.DIRETIDE:
  //           m2.game_mode = Dota_GameMode.DIRETIDE;
  //           break;
  //         case MatchmakingMode.GREEVILING:
  //           m2.game_mode = Dota_GameMode.GREEVILING;
  //           break;
  //         case MatchmakingMode.ABILITY_DRAFT:
  //           m2.game_mode = Dota_GameMode.ABILITY_DRAFT;
  //           break;
  //         case MatchmakingMode.TOURNAMENT:
  //           m2.game_mode = Dota_GameMode.CAPTAINS_MODE;
  //           break;
  //         case MatchmakingMode.BOTS:
  //           m2.game_mode = Dota_GameMode.ALLPICK;
  //           break;
  //         case MatchmakingMode.HIGHROOM:
  //           m2.game_mode = Dota_GameMode.RANKED_AP;
  //           break;
  //         case MatchmakingMode.TOURNAMENT_SOLOMID:
  //           m2.game_mode = Dota_GameMode.SOLOMID;
  //           break;
  //         case MatchmakingMode.CAPTAINS_MODE:
  //           m2.game_mode = Dota_GameMode.CAPTAINS_MODE;
  //           break;
  //       }
  //       m2.duration = m1.duration;
  //       m2.timestamp = m1.timestamp;
  //       m2.winner = m1.radiant_win ? DotaTeam.RADIANT : DotaTeam.DIRE;
  //
  //       return m2;
  //     });
  //
  //     await this.finishedMatchRepository.save(newMatches);
  //     console.log(`Migrated chunk #${i}(${slice.length} matches)`)
  //   }
  //
  //
  //   console.log('Migrated all matches')
  //
  //
  //
  //
  // }

  public async getCurrentSeason(version: Dota2Version): Promise<GameSeason> {
    return this.gameSeasonRepository.findOne({
      where: {
        start_timestamp: LessThanOrEqual(new Date()),
      },
      order: {
        start_timestamp: 'DESC',
      },
    });
  }

  public async getGamesPlayed(
    season: GameSeason,
    pid: PlayerId,
    mode: MatchmakingMode,
  ) {
    let plr = await this.versionPlayerRepository.findOne({
      where: { version: Dota2Version.Dota_681, steam_id: pid.value },
    });

    if (!plr) {
      plr = new VersionPlayer();
      plr.steam_id = pid.value;
      plr.version = season.version;
      plr.mmr = VersionPlayer.STARTING_MMR;
      await this.versionPlayerRepository.save(plr);
    }

    return this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where('pim.playerId = :id', { id: plr.steam_id })
      .andWhere('m.matchmaking_mode = :mode', { mode })
      .andWhere('m.timestamp > :season', { season: season.start_timestamp })
      .getCount();
  }
}
