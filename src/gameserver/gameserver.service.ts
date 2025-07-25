import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository } from 'typeorm';
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
import { ConfigService } from '@nestjs/config';
import { GameResultsEvent, PlayerInMatchDTO } from 'gateway/events/gs/game-results.event';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { HeroMap } from 'util/items';
import { SteamIds } from 'gameserver/steamids';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';
import { MetricsService } from 'metrics/metrics.service';
import { MmrBucketView } from 'gameserver/model/mmr-bucket.view';
import { wait } from 'util/wait';
import { PlayerFeedbackService } from 'gameserver/service/player-feedback.service';
import { PlayerAspect } from 'gateway/shared-types/player-aspect';
import { AmqpConnection } from '@golevelup/nestjs-rabbitmq';

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
export class GameServerService implements OnApplicationBootstrap {
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
    @InjectRepository(MmrBucketView)
    private readonly mmrBucketViewRepository: Repository<MmrBucketView>,
    @InjectRepository(GameServerSessionEntity)
    private readonly sessionRepo: Repository<GameServerSessionEntity>,
    private readonly metrics: MetricsService,
    private readonly config: ConfigService,
    private readonly reportService: PlayerFeedbackService,
    private readonly amqpConnection: AmqpConnection
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async refreshLeaderboard() {
    await this.leaderboardViewRepository.query(
      `refresh materialized view leaderboard_view`,
    );
    this.logger.log("Refreshed leaderboard_view");
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshLeaderboardView() {
    await this.leaderboardViewRepository.query(
      `refresh materialized view mmr_bucket_view`,
    );

    this.logger.log("Refreshed mmr_bucket_view");

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

  public async generateFakeMatch(forceSteamId: string) {
    let m = new MatchEntity();
    m.server = "fdf";
    m.finished = true;
    m.mode = MatchmakingMode.UNRANKED;
    m.started = true;
    m = await this.matchEntityRepository.save(m);
    function shuffle<T>(array: T[]): T[] {
      let currentIndex = array.length;

      // While there remain elements to shuffle...
      while (currentIndex != 0) {
        // Pick a remaining element...
        let randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
          array[randomIndex],
          array[currentIndex],
        ];
      }
      return array;
    }
    shuffle(SteamIds);

    const slice = SteamIds.slice(0, 10);
    if (slice.findIndex((t) => t.steam_id === forceSteamId) === -1) {
      slice[0] = {
        steam_id: forceSteamId,
      };
    }

    const g: GameResultsEvent = {
      matchId: m.id,
      winner: Math.random() > 0.5 ? DotaTeam.RADIANT : DotaTeam.DIRE,
      duration: Math.round(Math.random() * 2000) + 500,
      gameMode: Dota_GameMode.ALLPICK,
      type: MatchmakingMode.UNRANKED,
      timestamp: new Date().getTime() / 1000,
      server: "fdf",
      players: slice.map(({ steam_id }, idx) =>
        this.mockPim(steam_id, idx < 5 ? DotaTeam.RADIANT : DotaTeam.DIRE),
      ),
    };

    await this.amqpConnection.publish(
      'app.events',
      GameResultsEvent.name,
      g
    );


    await wait(2000);
    // Do some reports
    for (let player of g.players) {
      const reported = shuffle(
        g.players
          .filter((t) => t.steam_id !== player.steam_id)
          .map((it) => it.steam_id),
      )[0];
      const aspect: PlayerAspect = shuffle(
        Object.keys(PlayerAspect)
          .filter((key) => isNaN(Number(key)))
          .map((it) => PlayerAspect[it]),
      )[0];

      try {
        await this.reportService.handlePlayerReport(
          player.steam_id,
          reported,
          aspect,
          m.id,
        );
      } catch (e) {
        this.logger.warn("Error while generating fake report", e);
      }
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  public async collectMetrics() {
    const sessions = await this.sessionRepo.find({});

    this.metrics.recordParallelGames(sessions.length);
    this.metrics.recordParallelPlayers(
      sessions.reduce((a, b) => a + b.players.length, 0),
    );
  }

  private mockPim(steamId: string, team: DotaTeam): PlayerInMatchDTO {
    const randint = (max: number) => Math.round(Math.random() * max);
    return {
      steam_id: steamId,
      team: team,
      partyIndex: Number(steamId) % 10,
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
      hero:
        "npc_dota_hero_" +
        HeroMap[Math.floor(Math.random() * HeroMap.length)].name,
    };
  }

  async onApplicationBootstrap() {
    // await this.refreshLeaderboardView();
  }
}
