export function avg(arr: number[]) {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}

// Mirrors leaderboard_view's SQL expressions exactly — keep both in sync.
export function winrate(wins: number, games: number) {
  return games > 0 ? wins / games : 0;
}

export function kda(kills: number, deaths: number, assists: number) {
  return (kills + assists) / Math.max(deaths, 1);
}
