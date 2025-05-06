export function avg(arr: number[]) {
  return arr.length === 0 ? 0 : sum(arr) / arr.length;
}

export function sum(arr: number[]) {
  return arr.reduce((a, b) => a + b, 0);
}
