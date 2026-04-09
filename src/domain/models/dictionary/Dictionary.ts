import { Letter } from '@/domain/enums.ts';
import TrieService from '@/domain/models/dictionary/services/trie/TrieService.ts';
import { DictionarySnapshot, FrozenNode, NextNodeGenerator } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  get rootNode(): FrozenNode {
    return this.trie;
  }

  get snapshot(): DictionarySnapshot {
    return {
      allLetters: this.allLetters,
      trie: this.trie,
    };
  }

  private constructor(
    public readonly trie: FrozenNode,
    public readonly allLetters: ReadonlySet<Letter>,
  ) {}

  static create(textData: string): Dictionary {
    const trie = TrieService.createTrie(textData.split('\n') as ReadonlyArray<string>);
    const allLetters = new Set<Letter>();
    this.freezeTree(trie);
    this.collectLetters(allLetters, trie);
    return new Dictionary(trie, allLetters);
  }

  static restoreFromSnapshot(snapshot: DictionarySnapshot): Dictionary {
    return new Dictionary(snapshot.trie, snapshot.allLetters);
  }

  private static collectLetters(allLetters: Set<Letter>, node: FrozenNode): void {
    for (const [childLetter, childNode] of node.children) {
      allLetters.add(childLetter);
      this.collectLetters(allLetters, childNode);
    }
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

  getNode(word: string, startNode: FrozenNode = this.trie): FrozenNode | null {
    return this.findNodeForWord(word, startNode);
  }

  isNodeFinal(node: FrozenNode): boolean {
    return node.isFinal;
  }

  private containsWord(word: string): boolean {
    const node = this.findNodeForWord(word);
    return node?.isFinal || false;
  }

  private findNodeForWord(word: string, startNode: FrozenNode = this.trie): FrozenNode | null {
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
