import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { GameSessionPlayerEntity } from "gameserver/model/game-session-player.entity";
import { Not, Repository } from "typeorm";
import { EventBus } from "@nestjs/cqrs";
import { Dota_GameRulesState } from "gateway/shared-types/dota-game-rules-state";
import { RunRconCommand } from "gateway/commands/RunRcon/run-rcon.command";
import { GameSessionData, GameSessionUpdateEvent } from "gateway/events/gs/game-session-update.event";

@Injectable()
export class GameSessionService {
  private logger = new Logger(GameSessionService.name);
  constructor(
    @InjectRepository(GameSessionPlayerEntity)
    private readonly gameSessionPlayerEntityRepository: Repository<GameSessionPlayerEntity>,
    private readonly ebus: EventBus,
  ) {}

  public async abandonSession(steamId: string) {
    const activeSession = await this.gameSessionPlayerEntityRepository.findOne({
      where: {
        steamId,
        userAbandoned: false,
        session: {
          gameState: Not(Dota_GameRulesState.POST_GAME),
        },
      },
      relations: ["session"],
    });

    this.logger.log("Session to abandon: ", activeSession);
    if (activeSession) {
      this.ebus.publish(
        new RunRconCommand(
          `d2c_abandon ${activeSession.steamId}`,
          activeSession.session.url,
        ),
      );
      activeSession.userAbandoned = true;

      // Update player
      await this.gameSessionPlayerEntityRepository.save(activeSession);

      // Emit event
      this.ebus.publish(new GameSessionUpdateEvent(steamId, undefined));
      this.logger.log(
        `UserAbandon game ${activeSession.steamId}`,
        activeSession.matchId,
      );
    }
  }

  public async createdSession(matchId: number) {
    this.logger.log("Session created: ", matchId);
    const plrs = await this.gameSessionPlayerEntityRepository.find({
      where: {
        matchId,
        userAbandoned: false,
        session: {
          gameState: Not(Dota_GameRulesState.POST_GAME),
        },
      },
      relations: ["session"]
    });

    const evts = plrs.map(
      (plr) =>
        new GameSessionUpdateEvent(
          plr.steamId,
          new GameSessionData(
            plr.session.matchId,
            plr.session.matchmaking_mode,
            plr.session.gameMode,
            false,
          ),
        ),
    );
    this.ebus.publishAll(evts);
  }
}
