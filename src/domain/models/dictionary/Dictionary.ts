import { Letter } from '@/domain/enums.ts';
import { Node } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  private static readonly FIRST_LETTER_CODE = Dictionary.computeFirstLetterCode();

  private static readonly LETTERS: ReadonlyArray<Letter> = Object.values(Letter);

  get buffer(): ArrayBuffer | SharedArrayBuffer {
    return this.data.buffer;
  }

  get rootNode(): Node {
    return 0 as Node;
  }

  private readonly data: Int32Array;

  private constructor(buffer: ArrayBuffer | SharedArrayBuffer) {
    this.data = new Int32Array(buffer);
  }

  static createFromBuffer(buffer: ArrayBuffer | SharedArrayBuffer): Dictionary {
    return new Dictionary(buffer);
  }

  private static computeFirstLetterCode(): number {
    const first = Object.values(Letter)[0];
    if (first === undefined) throw new ReferenceError('First letter must be defined');
    return first.charCodeAt(0);
  }

  containsAllWords(words: ReadonlyArray<string>): boolean {
    if (words.length === 0) throw new Error('Words array is empty');
    return words.every(word => {
      const node = this.getNode(word);
      return node !== null && this.isNodeFinal(node);
    });
  }

  forEachNodeChild(node: Node, callback: (letter: Letter, childNode: Node) => void): void {
    const data = this.data;
    for (let i = 0; i < Dictionary.LETTERS.length; i++) {
      const childOffset = data[(node as number) + 1 + i];
      if (childOffset === undefined) throw new ReferenceError('Child offset must be defined');
      const letter = Dictionary.LETTERS[i];
      if (letter === undefined) throw new ReferenceError('Letter must be defined');
      if (childOffset !== 0) callback(letter, childOffset as Node);
    }
  }

  getNode(word: string, startNode: Node = this.rootNode): Node | null {
    const data = this.data;
    let current = startNode as number;
    for (let i = 0; i < word.length; i++) {
      const childOffset = data[current + 1 + word.charCodeAt(i) - Dictionary.FIRST_LETTER_CODE];
      if (childOffset === undefined) throw new ReferenceError('Child offset must be defined');
      if (childOffset === 0) return null;
      current = childOffset;
    }
    return current as Node;
  }

  isNodeFinal(node: Node): boolean {
    return this.data[node as number] === 1;
  }
}
