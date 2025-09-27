import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { combos } from 'util/cross';
import { AchievementService } from 'gameserver/achievement.service';
import { AchievementCompleteEvent } from 'gateway/events/gs/achievement-complete.event';

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
  ) {}

  async execute({ matchId, matchmakingMode }: ProcessAchievementsCommand) {
    const fm = await this.finishedMatchEntityRepository.findOne({
      where: { id: matchId },
    });

    const handles = combos(
      fm.players,
      Array.from(this.ach.achievementMap.values()),
    ).map(async ([player, achievement]) => {
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
      const updateResult = await achievement.handleMatch(player, fm, ach);
      if (updateResult === "none") {
        return;
      }

      await this.achievementEntityRepository.save(ach);
      if (updateResult === "checkpoint") {
        this.ebus.publish(
          new AchievementCompleteEvent(
            achievement.key,
            player.playerId,
            player.hero,
            ach.matchId,
            ach.progress,
            achievement.getCompleteCheckpoint(ach),
            achievement.checkpoints,
          ),
        );
      }
    });
    await Promise.all(handles);
  }
}
