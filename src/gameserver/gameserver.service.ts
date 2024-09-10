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
import * as fs from 'fs';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';

export interface MatchD2Com {
  players: Player[];
  timestamp: number;
  duration: number;
  server: string;
  winner: number;
  matchmaking_mode: number;
}

export interface Player {
  steam64: string;
  playerId: string;
  kills: number;
  deaths: number;
  assists: number;
  level: number;
  last_hits: number;
  denies: number;
  gpm: number;
  xpm: number;
  hd: number;
  td: number;
  gold: number;
  hero: string;
  team: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
}

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
    private readonly finishedMatchRepository: Repository<FinishedMatch>, // @InjectRepository(MatchEntity)
  ) // private readonly matchEntityRepository: Repository<MatchEntity>,
  {
    // this.migrateShit();

    // this.migrateItems();
    // this.migrated2com();
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
      console.log(`Chunk ${i} of ${chunks} complete`);
    }
  }

  public async migrated2com() {
    const matches = await fs.promises.readdir('matches');

    const chunkSize = 64;
    const chunks = Math.ceil(matches.length / chunkSize);
    for(let i = 0; i < chunks; i++){
      const slice = matches.slice(i * chunkSize, (i + 1) * chunkSize).map(it => Number(it.split('.')[0]));;
      const tasks = Promise.all(slice.map(it => this.migrateMatch(it)));
      await tasks;

      console.log(`Migrated chunk ${i} out of ${chunks} chunks`)
    }
  }

  private async migrateMatch(id: number) {
    const magicD2ComConstant = 1000000;

    const realId = magicD2ComConstant + id;

    const j: MatchD2Com = JSON.parse(
      (await fs.promises.readFile(`./matches/${id}.json`)).toString(),
    );

    let fm = await this.finishedMatchRepository.findOne({
      where: { externalMatchId: id, id: realId },
    });
    if (fm) {

      // return;

      const pims = await this.playerInMatchRepository.find({
         where: {match: fm}
      });

      await this.playerInMatchRepository.remove(pims)

      await this.finishedMatchRepository.remove(fm);
      console.log(`External match ${id} already exists`);
    }

    fm = new FinishedMatch(
      realId,
      j.winner,
      new Date(j.timestamp).toString(),
      Dota_GameMode.ALLPICK,
      j.matchmaking_mode as MatchmakingMode,
      j.duration,
      j.server,
    );
    fm.externalMatchId = id;
    fm = await this.finishedMatchRepository.save(fm);

    let pims: PlayerInMatch[] = j.players.map(it => {
      const pim = new PlayerInMatch();
      pim.playerId = it.playerId;
      pim.team = it.team;
      pim.kills = it.kills;
      pim.deaths = it.deaths;
      pim.assists = it.assists;
      pim.level = it.level;
      pim.gpm = it.gpm;
      pim.xpm = it.xpm;
      pim.abandoned = false;
      pim.last_hits = it.last_hits;
      pim.denies = it.denies;
      pim.hero = it.hero;
      pim.items = '';
      pim.item0 = it.item0;
      pim.item1 = it.item1;
      pim.item2 = it.item2;
      pim.item3 = it.item3;
      pim.item4 = it.item4;
      pim.item5 = it.item5;
      pim.match = fm;
      pim.gold = it.gold;
      return pim;
    });

    pims = await this.playerInMatchRepository.save(pims);
    // console.log(pims);
  }
}
