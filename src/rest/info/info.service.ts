import { Injectable } from '@nestjs/common';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
  ) {}

  public async updateGamemode(
    mode: MatchmakingMode,
    game_mode: Dota_GameMode,
    enabled: boolean,
  ) {
    await this.matchmakingModeMappingEntityRepository.upsert(
      {
        lobbyType: mode,
        dotaGameMode: game_mode,
        enabled,
      },
      ["lobbyType"],
    );
  }
}
