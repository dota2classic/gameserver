import { CommandHandler, EventBus, ICommandHandler } from '@nestjs/cqrs';
import { Logger } from '@nestjs/common';
import { CheckFirstGameCommand } from 'gameserver/command/CheckFirstGame/check-first-game.command';
import { DataSource } from 'typeorm';
import { PlayerFinishedMatchEvent } from 'gateway/events/gs/player-finished-match.event';

@CommandHandler(CheckFirstGameCommand)
export class CheckFirstGameHandler
  implements ICommandHandler<CheckFirstGameCommand>
{
  private readonly logger = new Logger(CheckFirstGameHandler.name);

  constructor(
    private readonly ds: DataSource,
    private readonly ebus: EventBus,
  ) {}

  async execute(command: CheckFirstGameCommand) {
    const res = await this.ds.query<{ steam_id: string; game_count: number }[]>(
      `
select 
    "playerId" as steam_id,
     count(*)::int as game_count
from 
    player_in_match pim
where "playerId" = ANY($1)
group by "playerId"
    `,
      [command.players],
    );

    this.ebus.publishAll(
      res.map(
        (t) =>
          new PlayerFinishedMatchEvent(
            command.matchId,
            t.steam_id,
            command.lobbyType,
            t.game_count === 1,
          ),
      ),
    );
  }
}
