import { Letter } from '@/domain/enums.ts';
import { DictionaryBuffer, Node } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  private static readonly FIRST_LETTER_CODE = Dictionary.computeFirstLetterCode();

  private static readonly LETTERS: ReadonlyArray<Letter> = Object.values(Letter);

  get buffer(): DictionaryBuffer {
    return this.data.buffer;
  }

  get rootNode(): Node {
    return 0 as Node;
  }

  private readonly data: Int32Array;

  private constructor(buffer: DictionaryBuffer) {
    this.data = new Int32Array(buffer);
  }

  static createFromBuffer(buffer: DictionaryBuffer): Dictionary {
    return new Dictionary(buffer);
  }

  private static computeFirstLetterCode(): number {
    const first = Object.values(Letter)[0];
    if (first === undefined) throw new ReferenceError('expected first letter, got undefined');
    return first.charCodeAt(0);
  }

  containsAllWords(words: ReadonlyArray<string>): boolean {
    if (words.length === 0) throw new Error('cannot check membership of empty word list');
    return words.every(word => {
      const node = this.getNode(word);
      return node !== null && this.isNodeFinal(node);
    });
  }

  forEachNodeChild(node: Node, callback: (letter: Letter, childNode: Node) => void): void {
    const data = this.data;
    for (let idx = 0; idx < Dictionary.LETTERS.length; idx++) {
      const childOffset = data[(node as number) + 1 + idx];
      if (childOffset === undefined) throw new ReferenceError(`expected child offset at index ${String(idx)}, got undefined`);
      const letter = Dictionary.LETTERS[idx];
      if (letter === undefined) throw new ReferenceError(`expected letter at index ${String(idx)}, got undefined`);
      if (childOffset !== 0) callback(letter, childOffset as Node);
    }
  }

  getNode(word: string, startNode: Node = this.rootNode): Node | null {
    const data = this.data;
    let current = startNode as number;
    for (let idx = 0; idx < word.length; idx++) {
      const childOffset = data[current + 1 + word.charCodeAt(idx) - Dictionary.FIRST_LETTER_CODE];
      if (childOffset === undefined)
        throw new ReferenceError(`expected child offset for letter "${String(word[idx])}", got undefined`);
      if (childOffset === 0) return null;
      current = childOffset;
    }
    return current as Node;
  }

  isNodeFinal(node: Node): boolean {
    return this.data[node as number] === 1;
  }
}
