import { Letter } from '@/domain/enums.ts';
import TrieService from '@/domain/models/dictionary/services/trie/TrieService.ts';
import { NextNodeGenerator, Node, ReadonlyNode, Trie } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  get rootNode(): ReadonlyNode {
    return this.trie;
  }

  private constructor(public readonly trie: Trie) {}

  static createFromText(text: ReadonlyArray<string>): Dictionary {
    const trie = TrieService.createNodeTree(text);
    return new Dictionary(trie);
  }

  static createFromTrie(trie: Trie): Dictionary {
    return new Dictionary(trie);
  }

  static deserializeNodeTree(array: ReadonlyArray<unknown>): Node {
    return TrieService.deserializeNodeTree(array);
  }

  containsAllWords(words: ReadonlyArray<string>): boolean {
    if (words.length === 0) throw new Error('Words array is empty');
    return words.every(word => this.containsWord(word));
  }

  createNextNodeGenerator({ startNode }: { startNode: ReadonlyNode }): NextNodeGenerator {
    function* generator(node: ReadonlyNode): Generator<[Letter, ReadonlyNode]> {
      for (const [possibleNextLetter, nodeForPossibleNextLetter] of node.children) {
        yield [possibleNextLetter, nodeForPossibleNextLetter];
      }
    }
    return generator(startNode);
  }

  getNode(word: string, startNode: ReadonlyNode = this.rootNode): null | ReadonlyNode {
    return this.findNodeForWord(word, startNode);
  }

  isNodeFinal(node: ReadonlyNode): boolean {
    return node.isFinal;
  }

  private containsWord(word: string): boolean {
    const node = this.findNodeForWord(word);
    return node?.isFinal || false;
  }

  private findNodeForWord(word: string, startNode: ReadonlyNode = this.rootNode): null | ReadonlyNode {
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
