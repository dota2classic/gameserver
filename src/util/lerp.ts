export function lerp(
  x: number,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
): number {
  if (x1 === x0) throw new Error("x0 and x1 cannot be the same value");
  return y0 + ((x - x0) * (y1 - y0)) / (x1 - x0);
}
