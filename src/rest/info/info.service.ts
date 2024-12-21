import { Injectable } from '@nestjs/common';
import { MatchmakingModeMappingEntity } from 'gameserver/model/matchmaking-mode-mapping.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';
import { Dota_Map } from 'gateway/shared-types/dota-map';

@Injectable()
export class InfoService {
  constructor(
    @InjectRepository(MatchmakingModeMappingEntity)
    private readonly matchmakingModeMappingEntityRepository: Repository<MatchmakingModeMappingEntity>,
  ) {}

  public async updateGamemode(
    mode: MatchmakingMode,
    game_mode: Dota_GameMode,
    dota_map: Dota_Map,
    enabled: boolean,
  ) {
    await this.matchmakingModeMappingEntityRepository.upsert(
      {
        lobbyType: mode,
        dotaGameMode: game_mode,
        dotaMap: dota_map,
        enabled,
      },
      ["lobbyType"],
    );
  }
}
