import { Letter } from '@/domain/enums.ts';
import { Node } from '@/domain/models/dictionary/types.ts';

export default class TrieService {
  static createNodeTree(sortedWords: ReadonlyArray<string>): Node {
    const rootNode = this.createNode();
    const stack: Array<Node> = [rootNode];
    const lastNodeInStack = (): Node => {
      const node = stack.at(-1);
      if (!node) throw new ReferenceError('Last node in stack must exist');
      return node;
    };
    let previousWord = '';
    for (const word of sortedWords) {
      const commonPrefixLength = this.getCommonPrefixLength(previousWord, word);
      if (previousWord.length > 0) lastNodeInStack().isFinal = true;
      while (stack.length > commonPrefixLength + 1) stack.pop();
      for (let i = commonPrefixLength; i < word.length; i++) {
        const childNode = this.createNode();
        lastNodeInStack().children.set(word[i] as Letter, childNode);
        stack.push(childNode);
      }
      previousWord = word;
    }
    if (stack.length > 1) lastNodeInStack().isFinal = true;
    return rootNode;
  }

  private static createNode(): Node {
    return { children: new Map(), isFinal: false };
  }

  private static getCommonPrefixLength(a: string, b: string): number {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }
}
