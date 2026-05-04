// TODO move to randomizer service
export default function shuffleWithFisherYates<T>({
  array,
  groupSize = 1,
  randomizerFunction = Math.random,
}: {
  array: Array<T>;
  groupSize?: number;
  randomizerFunction?: () => number;
}): Array<T> {
  const length = array.length - (array.length % groupSize);
  for (let srcIdx = length - groupSize; srcIdx >= 0; srcIdx -= groupSize) {
    const targetIdx = Math.floor(randomizerFunction() * (srcIdx / groupSize + 1)) * groupSize;
    for (let offset = 0; offset < groupSize; offset++) {
      const fromIdx = srcIdx + offset;
      const toIdx = targetIdx + offset;
      const itemA = array[fromIdx];
      const itemB = array[toIdx];
      if (itemA === undefined || itemB === undefined) {
        throw new ReferenceError(`expected array items at indices ${String(fromIdx)} and ${String(toIdx)}, got undefined`);
      }
      array[fromIdx] = itemB;
      array[toIdx] = itemA;
    }
  }
  return array;
}
