export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getRandomInt({ from = 0, to = 100 }: { from?: number; to?: number }): number {
  if (from > to) throw new Error('getRandomInt from is bigger than to');
  return Math.floor(Math.random() * (to - from + 1)) + from;
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
