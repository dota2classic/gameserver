import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Connection, In, LessThanOrEqual, Repository } from 'typeorm';
import { PlayerId } from 'gateway/shared-types/player-id';
import { Dota2Version } from 'gateway/shared-types/dota2version';
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

  public async getCurrentSeason(
    version: Dota2Version,
  ): Promise<GameSeasonEntity> {
    return this.gameSeasonRepository.findOne({
      where: {
        startTimestamp: LessThanOrEqual(new Date()),
      },
      order: {
        startTimestamp: "DESC",
      },
    });
  }

  public async getGamesPlayed(
    season: GameSeasonEntity,
    pid: PlayerId,
    modes: MatchmakingMode[] | undefined,
    beforeTimestamp: string,
  ) {
    let plr = await this.versionPlayerRepository.findOne({
      where: { steamId: pid.value, seasonId: season.id },
    });

    if (!plr) {
      plr = new VersionPlayerEntity(
        pid.value,
        VersionPlayerEntity.STARTING_MMR,
        season.id,
      );
      await this.versionPlayerRepository.save(plr);
    }

    let q = this.playerInMatchRepository
      .createQueryBuilder("pim")
      .innerJoin("pim.match", "m")
      .where("pim.playerId = :id", { id: plr.steamId })
      .andWhere("m.timestamp > :season", { season: season.startTimestamp })
      .andWhere("m.timestamp < :current_timestamp", {
        current_timestamp: beforeTimestamp,
      });

    if (modes != undefined)
      q = q.andWhere("m.matchmaking_mode in (:...modes)", { modes });

    return q.getCount();
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
}
