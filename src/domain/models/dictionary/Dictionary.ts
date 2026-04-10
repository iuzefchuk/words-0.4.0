import { Letter } from '@/domain/enums.ts';
import TrieService from '@/domain/models/dictionary/services/trie/TrieService.ts';
import { FrozenNode, NextNodeGenerator, Trie } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  get rootNode(): FrozenNode {
    return this.trie;
  }

  private constructor(public readonly trie: Trie) {}

  static createFromText(text: string): Dictionary {
    const trie = TrieService.createNodeTree(text.split('\n') as ReadonlyArray<string>);
    this.freezeTree(trie);
    return new Dictionary(trie);
  }

  static createFromTrie(trie: Trie): Dictionary {
    return new Dictionary(trie);
  }

  private static freezeTree(node: FrozenNode): void {
    for (const child of node.children.values()) this.freezeTree(child);
    Object.freeze(node.children);
    Object.freeze(node);
  }

  containsAllWords(words: ReadonlyArray<string>): boolean {
    if (words.length === 0) throw new Error('Words array is empty');
    return words.every(word => this.containsWord(word));
  }

  createNextNodeGenerator({ startNode }: { startNode: FrozenNode }): NextNodeGenerator {
    function* generator(node: FrozenNode): Generator<[Letter, FrozenNode]> {
      for (const [possibleNextLetter, nodeForPossibleNextLetter] of node.children) {
        yield [possibleNextLetter, nodeForPossibleNextLetter];
      }
    }
    return generator(startNode);
  }

  getNode(word: string, startNode: FrozenNode = this.rootNode): FrozenNode | null {
    return this.findNodeForWord(word, startNode);
  }

  isNodeFinal(node: FrozenNode): boolean {
    return node.isFinal;
  }

  private containsWord(word: string): boolean {
    const node = this.findNodeForWord(word);
    return node?.isFinal || false;
  }

  private findNodeForWord(word: string, startNode: FrozenNode = this.rootNode): FrozenNode | null {
    let currentNode = startNode;
    for (let i = 0; i < word.length; i++) {
      const letter = word[i] as Letter;
      const nextNode = currentNode.children.get(letter);
      if (!nextNode) return null;
      currentNode = nextNode;
    }
    return currentNode;
  }
}
