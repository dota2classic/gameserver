import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { SaveMatchFailedCommand } from 'gameserver/command/SaveMatchFailed/save-match-failed.command';
import { InjectRepository } from '@nestjs/typeorm';
import { PlayerCrimeLogEntity } from 'gameserver/model/player-crime-log.entity';
import { Repository } from 'typeorm';
import { MatchEntity } from 'gameserver/model/match.entity';
import { PlayerNotLoadedEvent } from 'gameserver/event/player-not-loaded.event';

@CommandHandler(SaveMatchFailedCommand)
export class SaveMatchFailedHandler
  implements ICommandHandler<SaveMatchFailedCommand>
{
  private logger = new Logger(SaveMatchFailedHandler.name);

  constructor(
    @InjectRepository(PlayerCrimeLogEntity)
    private readonly playerCrimeLogEntityRepository: Repository<
      PlayerCrimeLogEntity
    >,
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly ebus: EventBus,
  ) {}

  async execute({ event }: SaveMatchFailedCommand) {
    const match = await this.matchEntityRepository.findOne({
      where: { id: event.matchId },
    });
    if (!match) {
      this.logger.warn('MatchFailedEvent on non-existing match', { match_id: event.matchId });
      return;
    }
    //
    this.logger.log(
      `Players failed to load into match ${match.id}: ${event.failedPlayers
        .map(it => it.value)
        .join(',')}`,
    );

    this.ebus.publishAll(
      event.failedPlayers.map(
        pl => new PlayerNotLoadedEvent(pl, event.matchId, match.matchInfoJson.mode),
      ),
    );
  }
}
