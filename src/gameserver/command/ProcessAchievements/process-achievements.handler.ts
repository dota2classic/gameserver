import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { ProcessAchievementsCommand } from 'gameserver/command/ProcessAchievements/process-achievements.command';
import FinishedMatchEntity from 'gameserver/model/finished-match.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import PlayerInMatchEntity from 'gameserver/model/player-in-match.entity';
import { AchievementEntity } from 'gameserver/model/achievement.entity';
import { combos } from 'util/cross';
import { AchievementCompleteEvent } from 'gameserver/event/achievement-complete.event';
import { AchievementService } from 'gameserver/achievement.service';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';

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

    if (
      matchmakingMode !== MatchmakingMode.RANKED &&
      matchmakingMode !== MatchmakingMode.UNRANKED
    )
      return;

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
      const isUpdated = await achievement.handleMatch(player, fm, ach);
      if (isUpdated) {
        await this.achievementEntityRepository.save(ach);
        if (achievement.isComplete(ach)) {
          this.ebus.publish(
            new AchievementCompleteEvent(
              achievement.key,
              player.playerId,
              player.hero,
              ach.matchId,
            ),
          );
        }
      }
    });
    await Promise.all(handles);
  }
}
