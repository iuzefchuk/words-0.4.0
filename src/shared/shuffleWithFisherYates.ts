export default function shuffleWithFisherYates<T>({
  array,
  groupSize = 1,
  randomizer = Math.random,
}: {
  array: Array<T>;
  groupSize?: number;
  randomizer?: () => number;
}): Array<T> {
  const length = array.length - (array.length % groupSize);
  for (let i = length - groupSize; i >= 0; i -= groupSize) {
    const j = Math.floor(randomizer() * (i / groupSize + 1)) * groupSize;
    for (let k = 0; k < groupSize; k++) {
      const a = i + k;
      const b = j + k;
      const itemA = array[a];
      const itemB = array[b];
      if (itemA === undefined || itemB === undefined) throw new ReferenceError('Array item must be defined');
      array[a] = itemB;
      array[b] = itemA;
    }
  }
  return array;
}
