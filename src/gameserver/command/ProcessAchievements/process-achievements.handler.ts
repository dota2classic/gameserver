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

    // 1. Build all combos (player × achievement)
    const playerAchievementPairs = combos(
      fm.players,
      Array.from(this.ach.achievementMap.values()),
    ).map(([pim, ach]) => ({
      pim,
      steam_id: pim.playerId,
      achievement_key: ach.key,
    }));

    // 2. Fetch existing achievements
    const existing = await this.achievementEntityRepository.find({
      where: playerAchievementPairs.map((p) => ({
        steam_id: p.steam_id,
        achievement_key: p.achievement_key,
      })),
    });

    // 3. Index existing by (steam_id, achievement_key)
    const existingMap = new Map(
      existing.map((a) => [`${a.steam_id}:${a.achievement_key}`, a]),
    );

    // 4. Build final array
    const results = playerAchievementPairs.map(
      ({ pim, steam_id, achievement_key }) => {
        const achievement =
          existingMap.get(`${steam_id}:${achievement_key}`) ??
          this.achievementEntityRepository.create({
            steam_id,
            achievement_key,
            progress: 0,
          });

        return {
          pim,
          ach: achievement,
          achievementHandler: this.ach.achievementMap.get(achievement_key),
        };
      },
    );

    this.logger.log(`Got a batch of player achievements: ${results.length}`)

    // Handle pairs
    const handles: (
      | [AchievementUpdateResult, AchievementEntity, BaseAchievement]
      | null
    )[] = await Promise.all(
      results.map(async ({ ach, pim, achievementHandler }) => {
        try {
          const updateResult = await achievementHandler.handleMatch(
            pim,
            fm,
            ach,
          );

          return [updateResult, ach, achievementHandler];
        } catch (e) {
          console.error(typeof e);
          console.error(e);

          this.logger.error("There was an issue handling achievement", e);
          return null;
        }
      }),
    );

    const toSave = handles.filter(Boolean).filter((t) => t[0] !== "none");
    const toEmit = toSave.filter((t) => t[0] === "checkpoint");

    await measureN(
      () =>
        this.ds.transaction(async (tx) => {
          await tx.upsert(
            AchievementEntity,
            toSave.map((c) => c[1]),
            ["steam_id", "achievement_key"],
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
