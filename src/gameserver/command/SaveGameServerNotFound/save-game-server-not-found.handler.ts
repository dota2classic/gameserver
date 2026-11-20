import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SaveGameServerNotFoundCommand } from 'gameserver/command/SaveGameServerNotFound/save-game-server-not-found.command';
import { MatchEntity } from 'gameserver/model/match.entity';
import { ReturnGoodPlayersToQueueEvent } from 'gateway/events/mm/return-good-players-to-queue.event';

const REQUEUE_WINDOW_MINUTES = 10;

@CommandHandler(SaveGameServerNotFoundCommand)
export class SaveGameServerNotFoundHandler
  implements ICommandHandler<SaveGameServerNotFoundCommand>
{
  private readonly logger = new Logger(SaveGameServerNotFoundHandler.name);

  constructor(
    @InjectRepository(MatchEntity)
    private readonly matchEntityRepository: Repository<MatchEntity>,
    private readonly ebus: EventBus,
  ) {}

  async execute({ event }: SaveGameServerNotFoundCommand) {
    const closed = await this.matchEntityRepository
      .createQueryBuilder()
      .update(MatchEntity)
      .set({ finished: true })
      .where('id = :id AND started = false AND finished = false', { id: event.matchId })
      .returning(`created_at > now() - interval '${REQUEUE_WINDOW_MINUTES} minutes' AS fresh`)
      .execute();

    if (closed.affected !== 1) {
      this.logger.log('GameServerNotFoundEvent for a started or closed match, skipping', { match_id: event.matchId });
      return;
    }

    if (!closed.raw[0].fresh) {
      this.logger.warn('No game server for a stale match, closed without requeue', { match_id: event.matchId });
      return;
    }

    const match = await this.matchEntityRepository.findOneByOrFail({ id: event.matchId });
    const steamIds = match.matchInfoJson?.players.map((player) => player.steamId) ?? [];
    this.logger.warn('No game server for match, returning players to queue', {
      match_id: match.id,
      players: steamIds.length,
    });
    if (steamIds.length > 0) {
      this.ebus.publish(new ReturnGoodPlayersToQueueEvent(steamIds, match.id, match.mode));
    }
  }
}
