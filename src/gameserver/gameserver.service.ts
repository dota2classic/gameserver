import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThanOrEqual, Repository } from 'typeorm';
import { PlayerId } from 'gateway/shared-types/player-id';
import { Dota2Version } from 'gateway/shared-types/dota2version';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { HeroMap, ItemMap } from 'util/items';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import * as cheerio from 'cheerio';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';

export interface MatchD2Com {
  id: number;
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
  private readonly logger = new Logger(GameServerService.name);

  constructor(
    @InjectRepository(VersionPlayerEntity)
    private readonly versionPlayerRepository: Repository<VersionPlayerEntity>,
    @InjectRepository(GameSeasonEntity)
    private readonly gameSeasonRepository: Repository<GameSeasonEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(LeaderboardView)
    private readonly leaderboardViewRepository: Repository<LeaderboardView>,
  ) {
    // this.migrateShit();
    // this.migrateItems();
    // this.migrated2com();
    // this.migratePendoSite();
    this.refreshLeaderboardView();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshLeaderboardView() {
    await this.leaderboardViewRepository.query(
      `refresh materialized view leaderboard_view`,
    );
    this.logger.log('Refreshed leaderboard_view');
    await this.leaderboardViewRepository.query(
      `refresh materialized view item_view`,
    );
    this.logger.log('Refreshed item_view');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async migratePendoSite() {
    // while we get new matches from api, we do
    // when we receive existing match, we break
    // 100 pages at a time
    for (let page = 0; page < 100; page++) {
      const { Matches } = await fetch(
        `https://dota2classic.com/API/Match/List?page=${page}`,
      ).then(it => it.json());
      const matchIds = Matches.map(it => it.MatchHistory.match_id);

      for (let matchId of matchIds) {
        // Check for existing
        const exists = await this.finishedMatchRepository.exists({
          where: { externalMatchId: matchId },
        });
        if (exists) {
          console.log('HOORAY! WE CAUGHT UP IN MATCHES');
          return;
        }

        const scrappedMatch = await this.scrapMatch(matchId);
        await this.migrateMatch(scrappedMatch);
        console.log(`Migrated match ${matchId}`);
      }
    }
  }

  // public async migrateShit() {
  //   const matches = await this.matchRepository.find({});
  //
  //   const chunkSize = 256;
  //
  //   for(let i = 0; i < Math.ceil(matches.length / chunkSize); i++){
  //     const slice = matches.slice(i * chunkSize, (i + 1) * chunkSize);
  //
  //     const newMatches: FinishedMatchEntity[] = slice.map(m1 => {
  //       const m2 = new FinishedMatchEntity();
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

  public async getCurrentSeason(version: Dota2Version): Promise<GameSeasonEntity> {
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
    season: GameSeasonEntity,
    pid: PlayerId,
    mode: MatchmakingMode,
  ) {
    let plr = await this.versionPlayerRepository.findOne({
      where: { version: Dota2Version.Dota_681, steam_id: pid.value },
    });

    if (!plr) {
      plr = new VersionPlayerEntity();
      plr.steam_id = pid.value;
      plr.version = season.version;
      plr.mmr = VersionPlayerEntity.STARTING_MMR;
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
  //         const fm = new FinishedMatchEntity(
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
  //           const d: Partial<PlayerInMatchEntity> = {
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

  // public async migrated2com() {
  //   const matches = await fs.promises.readdir('matches');
  //
  //   const chunkSize = 64;
  //   const chunks = Math.ceil(matches.length / chunkSize);
  //   for (let i = 0; i < chunks; i++) {
  //     const slice = matches
  //       .slice(i * chunkSize, (i + 1) * chunkSize)
  //       .map(it => Number(it.split('.')[0]));
  //     const tasks = Promise.all(slice.map(it => this.migrateMatch(it)));
  //     await tasks;
  //
  //     console.log(`Migrated chunk ${i} out of ${chunks} chunks`);
  //   }
  // }

  private async migrateMatch(j: MatchD2Com) {
    const magicD2ComConstant = 1000000;

    const id = j.id;
    const realId = magicD2ComConstant + id;

    let fm = await this.finishedMatchRepository.findOne({
      where: { externalMatchId: id, id: realId },
    });
    if (fm) {
      // return;

      const pims = await this.playerInMatchRepository.find({
        where: { match: fm },
      });

      await this.playerInMatchRepository.remove(pims);

      await this.finishedMatchRepository.remove(fm);
      console.log(`External match ${id} already exists`);
    }

    fm = new FinishedMatchEntity(
      realId,
      j.winner,
      new Date(j.timestamp).toUTCString(),
      Dota_GameMode.ALLPICK,
      j.matchmaking_mode as MatchmakingMode,
      j.duration,
      j.server,
    );
    fm.externalMatchId = id;
    fm = await this.finishedMatchRepository.save(fm);

    let pims: PlayerInMatchEntity[] = j.players.map(it => {
      const pim = new PlayerInMatchEntity();
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

  private async scrapMatch(matchId: number): Promise<MatchD2Com> {
    const url = `https://dota2classic.com/Match/${matchId}`;
    console.log('SCraping');

    const $ = await cheerio.fromURL(url);

    const matchId2 = $('.match-info-id')
      .text()
      .replace('Match ID: ', '');
    const [m, s] = $('.match-info-duration')
      .text()
      .split(':')
      .map(it => it.trim())
      .map(Number);

    const duration = m * 60 + s;

    const winner = $('.match-info-radiant-victory')
      .text()
      .toLowerCase()
      .includes('radiant')
      ? 2
      : 3;

    const date = new Date($('.match-info-date time').attr('datetime'));

    const players = $('.player-row')
      .map(function(i) {
        const $el = $(this);

        const teamWrap = $el
          .parent()
          .parent()
          .parent();
        const team = teamWrap
          .find('.team-title')
          .text()
          .toLowerCase()
          .includes('radiant')
          ? 2
          : 3;

        const heroid = $el.find('.player-hero').data('heroid');
        const hero =
          `npc_dota_hero_` + HeroMap.find(it => it.id === heroid).name;
        const steam64 = $el
          .find('.player-name-link')
          .attr('href')
          .split('/')[2];
        const level = parseInt($el.find('.player-level').text());
        const kills = parseInt($el.find('.player-kills').text());
        const deaths = parseInt($el.find('.player-deaths').text());
        const assists = parseInt($el.find('.player-assists').text());
        const gpm = parseInt($el.find('.player-gpm').text());
        const xpm = parseInt($el.find('.player-xpm').text());
        const hd = parseInt($el.find('.player-hd').text());
        const td = parseInt($el.find('.player-td').text());
        // const gold = parseInt();
        // 14.2k
        // if has 'k' in it, remove it
        let rawGold = $el.find('.player-gold').text().replace('k', '');
        // if is float, a.k. was thousands, mult
        const gold = rawGold.includes('\.') ? Number(rawGold) * 1000 : Number(rawGold);
        const last_hits = parseInt($el.find('.player-lasthits').text());
        const denies = parseInt($el.find('.player-denies').text());

        const itemList = $el
          .find('.player-stat-item')
          .toArray()
          .map(it => it.attribs['data-itemid'])
          .map(Number); //.map(itemid => items.find(it => it.id === itemid).name);

        return {
          steam64: steam64,
          playerId: (BigInt(steam64) - BigInt('76561197960265728')).toString(),
          kills,
          deaths,
          assists,
          team,
          level,
          last_hits,
          denies,
          gpm,
          xpm,
          hd,
          td,
          gold,
          hero,
          item0: itemList[0],
          item1: itemList[1],
          item2: itemList[2],
          item3: itemList[3],
          item4: itemList[4],
          item5: itemList[5],
        };
      })
      .toArray();

    const isBotMatch = players.find(it => Number(it.steam64) <= 10);

    return {
      id: matchId,
      players,
      timestamp: date.getTime(),
      duration,
      server: 'dota2classic.com',
      winner: winner,
      matchmaking_mode: isBotMatch ? 7 : 1, // 1 = unranked
    };
  }
}
