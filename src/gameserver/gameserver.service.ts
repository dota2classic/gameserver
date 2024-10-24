import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, LessThanOrEqual, Repository } from 'typeorm';
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
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { ProcessRankedMatchHandler } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.handler';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { GameResultsEvent } from 'gateway/events/gs/game-results.event';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { MatchEntity } from 'gameserver/model/match.entity';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';

export interface MatchD2Com {
  id: number;
  players: Player[];
  timestamp: number;
  duration: number;
  server: string;
  winner: DotaTeam;
  matchmaking_mode: MatchmakingMode;
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

interface MMRConfig {
  calibrationGames: number;
  kindCalibrationGames: number;
  baseMmr: number;
  maxDeviation: number;
  avgDiffCap: number;
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
    @InjectRepository(ItemHeroView)
    private readonly itemHeroViewRepository: Repository<ItemHeroView>,
    private readonly cbus: CommandBus,
    private readonly connection: Connection,
    private readonly ebus: EventBus,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
  ) {
    // this.migrateShit();
    // this.migrateItems();
    // this.migrated2com();
    this.migratePendoSite();
    // this.testMMRPreview();
    this.refreshLeaderboardView();

    return;
    setTimeout(async () => {
      const matches = await this.finishedMatchRepository.find({
        where: {
          matchmaking_mode: In([
            MatchmakingMode.RANKED,
            MatchmakingMode.UNRANKED,
          ]),
        },
        // take: 1000
      });

      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        await this.cbus.execute(
          new ProcessAchievementsCommand(match.id, MatchmakingMode.UNRANKED),
        );

        this.logger.log(
          `Achievements complete for ${i + 1} / ${matches.length}`,
        );
      }
    }, 100);
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
    await this.leaderboardViewRepository.query(
      `refresh materialized view item_hero_view`,
    );
    this.logger.log('Refreshed item_hero_view');
  }

  public static calculateMmrDeviation(
    winnerAverageMmr: number,
    loserAverageMmr: number,
  ) {
    const averageDiff = Math.abs(winnerAverageMmr - loserAverageMmr);

    // how much to add to remove from winners and add to losers
    return (
      (ProcessRankedMatchHandler.AVERAGE_DEVIATION_MAX *
        Math.min(averageDiff, ProcessRankedMatchHandler.AVERAGE_DIFF_CAP)) /
      ProcessRankedMatchHandler.AVERAGE_DIFF_CAP
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async migratePendoSite() {
    // while we get new matches from api, we do
    // when we receive existing match, we break
    // 100 pages at a time
    // for (let page = 0; page < 100; page++) {
    let successfulPages = 0;
    for (let page = 0; page < 1000; page++) {
      const { Matches } = await fetch(
        `https://dota2classic.com/API/Match/List?page=${page}`,
      ).then(it => it.json());
      const matchIds: number[] = Matches.map(it => it.MatchHistory.id);
      if (matchIds.length === 0) {
        this.logger.log('Done syncing matches with d2com');
        return;
      }

      let hasExisting = false;
      for (let matchId of matchIds) {
        // Check for existing
        const exists = await this.finishedMatchRepository.exists({
          where: { externalMatchId: matchId },
        });
        if (exists) {
          hasExisting = true;
          continue;
        }

        try {
          const scrappedMatch = await this.scrapMatch(matchId);

          await this.migrateMatch(scrappedMatch);
        } catch (e) {
          this.logger.error(`There was an error scrapping match ${matchId}`);
          this.logger.error(e);
        }
      }
      this.logger.verbose(`Migrated page ${page}`);
      if (hasExisting) {
        this.logger.log(`Caught up in matches at match ${matchIds.join(',')}`);
        successfulPages++;
        // break;
      }
      if (successfulPages >= 5) {
        this.logger.log(
          'We are surely caught up: 5 successful pages in a row. Stopping scraper',
        );
        return;
      }
    }
  }

  public async getCurrentSeason(
    version: Dota2Version,
  ): Promise<GameSeasonEntity> {
    return this.gameSeasonRepository.findOne({
      where: {
        start_timestamp: LessThanOrEqual(new Date()),
      },
      order: {
        start_timestamp: 'DESC',
      },
    });
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
    // Emit game results

    const magicD2ComConstant = 1000000;

    const id = j.id;
    const realId = magicD2ComConstant + id;

    // now we can do it

    await this.ebus.publish(
      new GameResultsEvent(
        realId,
        j.winner,
        j.duration,
        Dota_GameMode.ALLPICK,
        j.matchmaking_mode,
        j.timestamp / 1000, // We need to divide here because GameResultsHandler multiplies by 1000
        'dota2classic.com',
        j.players.map(player => ({
          steam_id: player.playerId,
          team: player.team,
          kills: player.kills,
          deaths: player.deaths,
          assists: player.assists,
          level: player.level,

          item0: player.item0,
          item1: player.item1,
          item2: player.item2,
          item3: player.item3,
          item4: player.item4,
          item5: player.item5,

          gpm: player.gpm,
          xpm: player.xpm,
          last_hits: player.last_hits,
          denies: player.denies,
          networth: player.gold,
          heroDamage: player.hd,
          towerDamage: player.td,
          heroHealing: 0,
          abandoned: false,
          hero: player.hero,
        })),
        j.id,
      ),
    );
  }

  public async getGamesPlayed(
    season: GameSeasonEntity,
    pid: PlayerId,
    mode: MatchmakingMode | undefined,
    afterMatchTimestamp: string,
  ) {
    let plr = await this.versionPlayerRepository.findOne({
      where: { version: Dota2Version.Dota_681, steam_id: pid.value },
    });

    if (!plr) {
      plr = new VersionPlayerEntity();
      plr.steam_id = pid.value;
      plr.version = season.version;
      plr.mmr = VersionPlayerEntity.STARTING_MMR;
      plr.hidden_mmr = VersionPlayerEntity.STARTING_MMR;
      await this.versionPlayerRepository.save(plr);
    }

    let q = this.playerInMatchRepository
      .createQueryBuilder('pim')
      .innerJoin('pim.match', 'm')
      .where('pim.playerId = :id', { id: plr.steam_id })
      .andWhere('m.timestamp > :season', { season: season.start_timestamp })
      .andWhere('m.timestamp < :current_timestamp', {
        current_timestamp: afterMatchTimestamp,
      });

    if (mode != undefined)
      q = q.andWhere('m.matchmaking_mode = :mode', { mode });

    return q.getCount();
  }

  private async scrapMatch(matchId: number): Promise<MatchD2Com> {
    const url = `https://dota2classic.com/Match/${matchId}`;

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

    function toCertainNumber(numberlike: string) {
      // 14.2k
      // if has 'k' in it, remove it
      let strippedLetters = numberlike.replace('k', '');
      return Math.round(
        strippedLetters.includes('.')
          ? Number(strippedLetters) * 1000
          : Number(strippedLetters),
      );
    }

    const gs = this;

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


        // There can be spirit bear here resulting in undefined heroid
        if(!heroid){
          gs.logger.warn(`Skipping spirit bear, text is: ${$el.find('.player-name-link').text()}`)
          return null;
        }

        const hero =
          `npc_dota_hero_` + HeroMap.find(it => it.id === heroid)?.name;

        if (!hero) {
          throw new Error(`Unknown hero id ${heroid}`);
        }


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
        const hd = toCertainNumber($el.find('.player-hd').text());
        const td = toCertainNumber($el.find('.player-td').text());
        // const gold = parseInt();
        // 14.2k
        // if has 'k' in it, remove it
        const gold = toCertainNumber($el.find('.player-gold').text());
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
      .toArray()
      .filter(Boolean);

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

  private async testMMRPreview() {
    const matches = await this.finishedMatchRepository.find({
      where: {
        // server: 'dota2classic.com',
        matchmaking_mode: In([
          MatchmakingMode.UNRANKED,
          MatchmakingMode.RANKED,
        ]),
      },
      order: {
        timestamp: 'ASC',
      },
      // take: 20,
      relations: ['players'],
    });
    for (let i = 0; i < matches.length; i++) {
      const match = matches[i];
      await this.cbus.execute(
        new ProcessRankedMatchCommand(
          match.id,
          match.players
            .filter(t => t.team === match.winner)
            .map(t => new PlayerId(t.playerId)),
          match.players
            .filter(t => t.team !== match.winner)
            .map(t => new PlayerId(t.playerId)),
          // tODO:
          MatchmakingMode.UNRANKED,
        ),
      );
      this.logger.log(`Processed match ${i + 1} / ${matches.length}`);
    }
  }
}
