import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { VersionPlayer } from 'gameserver/entity/VersionPlayer';
import { LessThanOrEqual, Repository } from 'typeorm';
import { GameSeason } from 'gameserver/entity/GameSeason';
import PlayerInMatch from 'gameserver/entity/PlayerInMatch';
import { PlayerId } from 'gateway/shared-types/player-id';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import FinishedMatch from 'gameserver/entity/finished-match';
import { ItemMap } from 'util/items';

@Injectable()
export class GameServerService {
  constructor(
    @InjectRepository(VersionPlayer)
    private readonly versionPlayerRepository: Repository<VersionPlayer>,
    @InjectRepository(GameSeason)
    private readonly gameSeasonRepository: Repository<GameSeason>,
    @InjectRepository(PlayerInMatch)
    private readonly playerInMatchRepository: Repository<PlayerInMatch>,
    @InjectRepository(FinishedMatch)
    private readonly finishedMatchRepository: Repository<FinishedMatch>,
  ) {
    // this.migrateShit();

    // this.migrateItems();
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

  public async migratePlayerInMatch() {}

  // public async scrapD2com() {
  //
  //
  //   for (let i = 0; i < 1; i++) {
  //     const url = `https://dota2classic.com/API/Match/List?page=0`;
  //     const d: any = await fetch(url).then(it => it.json());
  //     await Promise.all(
  //       d.Matches.map(async match => {
  //         console.log(match);
  //         const fm = new FinishedMatch(
  //           match.MatchHistory.match_id,
  //           match.MatchHistory.winner ? DotaTeam.RADIANT : DotaTeam.DIRE,
  //           match.MatchHistory.endtime,
  //           match.MatchHistory.game_mode_id,
  //           match.MatchHistory.game_mode_id,
  //           match.MatchHistory.duration,
  //           'dota2classic.com',
  //         );
  //
  //         const item = id => items.find(it => it.id === id).name;
  //
  //         // @ts-ignore
  //         fm.players = [
  //           ...match.Teams.RadiantPlayers,
  //           ...match.Teams.DirePlayers,
  //         ].map((raw, index) => {
  //           const d: Partial<PlayerInMatch> = {
  //             playerId: (
  //               BigInt(raw.steam64_id) - BigInt('76561197960265728')
  //             ).toString(),
  //             team: raw.team ? DotaTeam.DIRE : DotaTeam.RADIANT,
  //             kills: raw.kills,
  //             deaths: raw.deaths,
  //             assists: raw.assists,
  //             level: raw.level,
  //             hero: heromap.find(it => it.id === raw.hero_id).name, // todo: translate via id
  //             last_hits: raw.last_hits,
  //             denies: raw.denies,
  //             gpm: raw.gpm,
  //             xpm: raw.xpm,
  //             items: [
  //               item(raw.item1),
  //               item(raw.item2),
  //               item(raw.item3),
  //               item(raw.item4),
  //               item(raw.item5),
  //               item(raw.item6),
  //             ].join(','),
  //           };
  //
  //           return d;
  //         });
  //
  //         const f = await fs.promises.writeFile(
  //           `matches/${match.MatchHistory.match_id}.json`,
  //           JSON.stringify(fm),
  //         );
  //       }),
  //     );
  //   }
  // }
  //
  public async migrateItems() {
    const players = await this.playerInMatchRepository.find();
    const chunkSize = 512;

    const chunks = Math.ceil(players.length / chunkSize);

    for (let i = 0; i < chunks; i++) {
      const slice = players.slice(i * chunkSize, (i + 1) * chunkSize);

      slice.forEach(it => {
        const [item0, item1, item2, item3, item4, item5] = it.items
          .split(',')
          .map(
            itemDeprecated =>
              ItemMap.find(it => itemDeprecated.includes(it.name)).id,
          );

        it.item0 = item0;
        it.item1 = item1;
        it.item2 = item2;
        it.item3 = item3;
        it.item4 = item4;
        it.item5 = item5;
      });

      await this.playerInMatchRepository.save(slice);
      console.log(`Chunk ${i} of ${chunks} complete`)
    }
  }
}
