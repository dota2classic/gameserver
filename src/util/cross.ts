export function combos<T, B>(arr1: T[], arr2: B[]): [T, B][] {
  const arr: [T, B][] = [];

  for (let t of arr1) {
    for (let b of arr2) {
      arr.push([t, b]);
    }
  }

  return arr;
}
