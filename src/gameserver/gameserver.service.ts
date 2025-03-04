import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, Repository } from 'typeorm';
import { PlayerId } from 'gateway/shared-types/player-id';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Cron, CronExpression } from '@nestjs/schedule';
import { LeaderboardView } from 'gameserver/model/leaderboard.view';
import { VersionPlayerEntity } from 'gameserver/model/version-player.entity';
import { GameSeasonEntity } from 'gameserver/model/game-season.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { ItemHeroView } from 'gameserver/model/item-hero.view';
import { CommandBus, EventBus } from '@nestjs/cqrs';
import { ProcessRankedMatchCommand } from 'gameserver/command/ProcessRankedMatch/process-ranked-match.command';
import { DotaTeam } from 'gateway/shared-types/dota-team';
import { MatchEntity } from 'gameserver/model/match.entity';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';
import { ConfigService } from '@nestjs/config';
import { GameResultsEvent, PlayerInMatchDTO } from 'gateway/events/gs/game-results.event';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { HeroMap } from 'util/items';
import { SaveGameResultsCommand } from 'gameserver/command/SaveGameResults/save-game-results.command';
import { SteamIds } from 'gameserver/steamids';

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
    private readonly config: ConfigService,
  ) {
    // this.migrateShit();
    // this.migrateItems();
    // this.migrated2com();
    if (config.get("prod")) {
      // this.migratePendoSite();
      // this.testMMRPreview();
      this.refreshLeaderboardView();
    }

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
    this.logger.log("Refreshed leaderboard_view");
    await this.leaderboardViewRepository.query(
      `refresh materialized view item_view`,
    );
    this.logger.log("Refreshed item_view");
    await this.leaderboardViewRepository.query(
      `refresh materialized view item_hero_view`,
    );
    this.logger.log("Refreshed item_hero_view");
  }

  public async debugProcessRankedMatch(id: number) {
    const match = await this.finishedMatchRepository.findOneOrFail({
      where: {
        id,
      },
      order: {
        timestamp: "ASC",
      },
      // take: 20,
      relations: ["players"],
    });

    await this.cbus.execute(
      new ProcessRankedMatchCommand(
        match.id,
        match.players
          .filter((t) => t.team === match.winner)
          .map((t) => new PlayerId(t.playerId)),
        match.players
          .filter((t) => t.team !== match.winner)
          .map((t) => new PlayerId(t.playerId)),
        match.matchmaking_mode,
      ),
    );
  }


  public async generateFakeMatch(){
    let m = new MatchEntity();
    m.server = "fdf"
    m.finished = true;
    m.mode = MatchmakingMode.UNRANKED;
    m.started = true;
    m = await this.matchEntityRepository.save(m)
    function shuffle(array: any[]) {
      let currentIndex = array.length;

      // While there remain elements to shuffle...
      while (currentIndex != 0) {

        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex], array[currentIndex]];
      }
    }
    shuffle(SteamIds);

    const g: GameResultsEvent = {
      matchId: m.id,
      winner: Math.random() > 0.5 ? DotaTeam.RADIANT : DotaTeam.DIRE,
      duration: Math.round(Math.random() * 2000) + 500 ,
      gameMode: Dota_GameMode.ALLPICK,
      type: MatchmakingMode.UNRANKED,
      timestamp: new Date().getTime() / 1000,
      server: "fdf",
      players: Array.from({ length: 10}, (_, idx) => this.mockPim(SteamIds[idx].steam_id, idx < 5 ? DotaTeam.RADIANT : DotaTeam.DIRE)),
    };

    await this.cbus.execute(new SaveGameResultsCommand(g));
  }

  private mockPim(steamId: string, team: DotaTeam): PlayerInMatchDTO {
    const randint = (max: number) => Math.round(Math.random() * max)
    return {
      steam_id: steamId,
      team: team,
      kills: randint(15),
      deaths: randint(15),
      assists: randint(15),
      level: randint(20) + 3,

      item0: randint(4) + 1,
      item1: randint(4) + 1,
      item2: randint(4) + 1,
      item3: randint(4) + 1,
      item4: randint(4) + 1,
      item5: randint(4) + 1,

      gpm: randint(600),
      xpm: randint(600),
      last_hits: randint(100),
      denies: randint(20),
      networth: randint(20_000),
      heroDamage: randint(10_000),
      towerDamage: randint(10_000),
      heroHealing: randint(10_000),
      abandoned: Math.random() > 0.98,
      hero: 'npc_dota_hero_' + HeroMap[Math.floor(Math.random() * HeroMap.length)].name,
    }
  }
}
