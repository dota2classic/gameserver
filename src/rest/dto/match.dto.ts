import { MatchmakingMode } from 'gateway/shared-types/matchmaking-mode';
import { Page } from 'rest/dto/page';

export class MatchDto {
  id: number;
  mode: MatchmakingMode;
  radiant: PlayerInMatchDto[];
  dire: PlayerInMatchDto[];
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

  last_hits: number;
  denies: number;

  items: string[];

  abandoned: boolean;
}

export class MatchPageDto extends Page<MatchDto> {
  data: MatchDto[];
  pages: number;
  perPage: number;
  page: number;
}
