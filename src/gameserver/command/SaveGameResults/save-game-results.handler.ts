import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SaveGameResultsCommand } from 'gameserver/command/SaveGameResults/save-game-results.command';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { MatchRecordedEvent } from 'gameserver/event/match-recorded.event';
import { GameSessionFinishedEvent } from 'gateway/events/game-session-finished.event';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { GameServerSessionEntity } from 'gameserver/model/game-server-session.entity';

@CommandHandler(SaveGameResultsCommand)
export class SaveGameResultsHandler
  implements ICommandHandler<SaveGameResultsCommand>
{
  private readonly logger = new Logger(SaveGameResultsHandler.name);

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(GameServerSessionEntity)
    private readonly gameServerSessionModelRepository: Repository<GameServerSessionEntity>,
    private readonly ebus: EventBus,
    private readonly datasource: DataSource,
  ) {}

  async execute({ event }: SaveGameResultsCommand) {
    const existingRecordedMatch = await this.finishedMatchRepository.exists({
      where: {
        id: event.matchId,
      },
    });

    if (existingRecordedMatch) {
      this.logger.warn("Tried to save already existing match", {
        match_id: event.matchId
      });
      return;
    }

    let modeOverride =
      (event.type === MatchmakingMode.UNRANKED ||
        event.type === MatchmakingMode.RANKED) &&
      event.players.length !== 10
        ? MatchmakingMode.BOTS
        : event.type;

    const m = await this.datasource.transaction<FinishedMatchEntity>(
      async (entityManager) => {
        const m = new FinishedMatchEntity(
          event.matchId,
          event.winner,
          new Date(event.timestamp * 1000).toISOString(),
          event.gameMode,
          modeOverride,
          event.duration,
          event.server,
        );

        m.externalMatchId = event.externalMatchId;

        await entityManager.save(m);

        const pims = event.players.map((t) => {
          const pim = new PlayerInMatchEntity();

          pim.match = m;
          // kda
          pim.kills = t.kills;
          pim.deaths = t.deaths;
          pim.assists = t.assists;

          // creeps
          pim.denies = t.denies;
          pim.last_hits = t.last_hits;

          // pm
          pim.gpm = t.gpm;
          pim.xpm = t.xpm;
          pim.hero_damage = t.heroDamage;
          pim.hero_healing = t.heroHealing;
          pim.tower_damage = t.towerDamage;

          pim.abandoned = t.abandoned;
          pim.gold = t.networth;

          pim.item0 = t.item0;
          pim.item1 = t.item1;
          pim.item2 = t.item2;
          pim.item3 = t.item3;
          pim.item4 = t.item4;
          pim.item5 = t.item5;

          pim.level = t.level;
          pim.playerId = t.steam_id;
          pim.team = t.team;
          pim.hero = t.hero;
          return pim;
        });

        await entityManager.save(pims);

        return m;
      },
    );

    await this.ebus.publish(
      new MatchRecordedEvent(
        event.matchId,
        event.winner,
        event.duration,
        m.matchmaking_mode,
        m.game_mode,
        event.timestamp,
        event.server,
        event.players,
      ),
    );

    const runningSession = await this.gameServerSessionModelRepository.findOne({
      where: {
        url: event.server,
      },
    });
    if (runningSession) {
      await this.gameServerSessionModelRepository.delete(runningSession.url);
      this.ebus.publish(
        new GameSessionFinishedEvent(
          runningSession.url,
          runningSession.matchId,
          runningSession.matchInfoJson,
        ),
      );
    }
  }
}
