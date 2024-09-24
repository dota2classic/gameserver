import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Page } from 'rest/dto/page';
import { Dota_GameMode } from 'gateway/shared-types/dota-game-mode';

export class MatchDto {
  id: number;
  mode: MatchmakingMode;
  game_mode: Dota_GameMode;
  radiant: PlayerInMatchDto[];
  dire: PlayerInMatchDto[];
  winner: number;
  duration: number;
  timestamp: string;
}

export class PlayerInMatchDto {
  steam_id: string;

  team: number;
  hero: string;
  level: number;

  kills: number;
  deaths: number;
  assists: number;

  gpm: number;
  xpm: number;

  hero_damage: number;
  hero_healing: number;
  tower_damage: number;

  last_hits: number;
  denies: number;

  gold: number;

  // items: string[];

  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;

  abandoned: boolean;
}

export class MatchPageDto extends Page<MatchDto> {
  data: MatchDto[];
  pages: number;
  perPage: number;
  page: number;
}
