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

  static async create(): Promise<Dictionary> {
    // TODO to infra service CompressionService
    const response = await fetch('/dictionary.gz');
    const buffer = await response.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // If the server transparently decompressed the gzip (e.g. via Content-Encoding: gzip),
    // the body won't have the gzip magic bytes and can be decoded directly.
    const isGzip = bytes[0] === 0x1f && bytes[1] === 0x8b;
    let textData: string;
    if (isGzip) {
      const stream = new DecompressionStream('gzip');
      const writer = stream.writable.getWriter();
      writer.write(bytes);
      writer.close();
      textData = await new Response(stream.readable).text();
    } else {
      textData = new TextDecoder().decode(buffer);
    }
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
