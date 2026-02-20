export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function getRandomInt({ from = 0, to = 100 }: { from?: number; to?: number }): number {
  if (from > to) throw new Error('getRandomInt from is bigger than to');
  return Math.floor(Math.random() * (to - from + 1)) + from;
}

export function getArrayOfInts({
  from = 0,
  to,
  incrementation = 1,
}: {
  from?: number;
  to: number;
  incrementation?: number;
}): Array<number> {
  if (from > to) throw new Error('getArrayOfInts from is bigger than to');
  if (incrementation < 1) throw new Error('getArrayOfInts incrementation can`t be less than 1');
  return Array.from({ length: Math.floor((to - from) / incrementation) + 1 }, (i, idx) => from + idx * incrementation);
}

export function shuffleArrayWithFisherYates<T>(array: Array<T>): Array<T> {
  let currentIdx = array.length;
  while (currentIdx !== 0) {
    const randomIdx = getRandomInt({ from: 0, to: currentIdx - 1 });
    currentIdx--;
    [array[currentIdx], array[randomIdx]] = [array[randomIdx], array[currentIdx]];
  }
  return array;
}
