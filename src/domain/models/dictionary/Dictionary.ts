import { Letter } from '@/domain/enums.ts';
import { Node, NodeChildren } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  private static readonly LETTERS: ReadonlyArray<Letter> = Object.values(Letter);

  private static readonly FIRST_LETTER_CODE = Dictionary.LETTERS[0]!.charCodeAt(0);

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

  containsAllWords(words: ReadonlyArray<string>): boolean {
    if (words.length === 0) throw new Error('Words array is empty');
    return words.every(word => {
      const node = this.getNode(word);
      return node !== null && this.isNodeFinal(node);
    });
  }

  getNode(word: string, startNode: Node = this.rootNode): Node | null {
    const data = this.data;
    let current = startNode as number;
    for (let i = 0; i < word.length; i++) {
      const childOffset = data[current + 1 + word.charCodeAt(i) - Dictionary.FIRST_LETTER_CODE]!;
      if (childOffset === 0) return null;
      current = childOffset;
    }
    return current as Node;
  }

  forEachNodeChild(node: Node, callback: (letter: Letter, childNode: Node) => void): void {
    const data = this.data;
    for (let i = 0; i < Dictionary.LETTERS.length; i++) {
      const childOffset = data[(node as number) + 1 + i]!;
      if (childOffset !== 0) {
        callback(Dictionary.LETTERS[i]!, childOffset as Node);
      }
    }
  }

  getNodeChildren(node: Node): NodeChildren {
    const data = this.data;
    const result: Record<string, Node> = Object.create(null) as Record<string, Node>;
    for (let i = 0; i < Dictionary.LETTERS.length; i++) {
      const childOffset = data[(node as number) + 1 + i]!;
      if (childOffset !== 0) {
        result[Dictionary.LETTERS[i]!] = childOffset as Node;
      }
    }
    return result;
  }

  isNodeFinal(node: Node): boolean {
    return this.data[node as number] === 1;
  }
}
