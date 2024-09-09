export class HeroStatsDto {
  playerId: string;
  gpm: number;
  xpm: number;
  kda: number;
  games: number;
  wins: number;
  loss: number;
  hero: string;
  last_hits: number;
  denies: number;
}


export class PlayerGeneralStatsDto {
  steam_id: string;
  games_played: number;
  games_played_all: number;
  wins: number;
  loss: number;
}
