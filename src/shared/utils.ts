export function shuffleWithFisherYates<T>(array: Array<T>, groupSize: number = 1): Array<T> {
  for (let i = array.length - groupSize; i > 0; i -= groupSize) {
    const j = Math.floor(Math.random() * (i / groupSize + 1)) * groupSize;
    for (let k = 0; k < groupSize; k++) {
      const temp = array[i + k];
      array[i + k] = array[j + k];
      array[j + k] = temp;
    }
  }
  return array;
}
