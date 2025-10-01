import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { combos } from 'util/cross';
import { AchievementService } from 'gameserver/achievement.service';
import { AchievementUpdateResult, BaseAchievement } from 'gameserver/achievements/base.achievement';
import { AchievementCompleteEvent } from 'gateway/events/gs/achievement-complete.event';
import { measureN } from 'util/measure';

@CommandHandler(ProcessAchievementsCommand)
export class ProcessAchievementsHandler
  implements ICommandHandler<ProcessAchievementsCommand>
{
  private readonly logger = new Logger(ProcessAchievementsHandler.name);

  constructor(
    @InjectRepository(FinishedMatchEntity)
    private readonly finishedMatchEntityRepository: Repository<FinishedMatchEntity>,
    @InjectRepository(PlayerInMatchEntity)
    private readonly playerInMatchEntityRepository: Repository<PlayerInMatchEntity>,
    @InjectRepository(AchievementEntity)
    private readonly achievementEntityRepository: Repository<AchievementEntity>,
    private readonly ebus: EventBus,
    private readonly ach: AchievementService,
    private readonly ds: DataSource,
  ) {}

  async execute({ matchId, matchmakingMode }: ProcessAchievementsCommand) {
    const fm = await this.finishedMatchEntityRepository.findOne({
      where: { id: matchId },
    });

    this.logger.log("Processing achievements");

    const handles: (
      | [AchievementUpdateResult, AchievementEntity, BaseAchievement]
      | null
    )[] = await Promise.all(
      combos(fm.players, Array.from(this.ach.achievementMap.values())).map(
        async ([player, achievement]) => {
          let ach = await this.achievementEntityRepository.findOne({
            where: {
              steam_id: player.playerId,
              achievement_key: achievement.key,
            },
          });
          if (!ach) {
            ach = new AchievementEntity();
            ach.steam_id = player.playerId;
            ach.achievement_key = achievement.key;
            ach.progress = 0;
          }

          try {
            const updateResult = await achievement.handleMatch(player, fm, ach);

            return [updateResult, ach, achievement];
          } catch (e) {
            console.error(typeof e);
            console.error(e);

            this.logger.error("There was an issue handling achievement", e);
            return null;
          }
        },
      ),
    );

    const toSave = handles.filter(Boolean).filter((t) => t[0] !== "none");
    const toEmit = toSave.filter((t) => t[0] === "checkpoint");


    await measureN(
      () =>
        this.ds.transaction(async (tx) => {
          await tx.upsert(
            AchievementEntity,
            toSave.map((c) => c[1]),
            ['steam_id', 'achievement_key']
          );
        }),
      "Saving all achievements",
    );
    this.logger.log(`Saved ${toSave.length} achievement updates`);

    const events = toEmit.map(
      ([_, ach, achievement]) =>
        new AchievementCompleteEvent(
          ach.achievement_key,
          ach.steam_id,
          "deprecated",
          ach.matchId,
          ach.progress,
          achievement.getCompleteCheckpoint(ach),
          achievement.checkpoints,
        ),
    );

    this.ebus.publishAll(events);
  }
}
