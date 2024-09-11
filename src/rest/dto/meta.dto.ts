export class HeroSummaryDto {
  games: number;
  wins: number;
  losses: number;
  kills: number;
  deaths: number;
  assists: number;
  gpm: number;
  xpm: number;
  last_hits: number;
  denies: number;
  hero: string;
}


export class HeroItemDto {
  item: number;
  game_count: number;
  wins: number;
  winrate: number;
}
