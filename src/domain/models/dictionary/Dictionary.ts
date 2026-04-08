import { Letter } from '@/domain/enums.ts';
import TrieService from '@/domain/models/dictionary/services/trie/TrieService.ts';
import { DictionarySnapshot, FrozenNode, NextNodeGenerator, NodeId } from '@/domain/models/dictionary/types.ts';

export default class Dictionary {
  get rootNodeId(): NodeId {
    return this.trie.id;
  }

  get snapshot(): DictionarySnapshot {
    return {
      allLetters: this.allLetters,
      nodeById: this.nodeById,
      trie: this.trie,
    };
  }

  private constructor(
    public readonly trie: FrozenNode,
    public readonly nodeById: ReadonlyMap<NodeId, FrozenNode>,
    public readonly allLetters: ReadonlySet<Letter>,
  ) {}

  static async create(): Promise<Dictionary> {
    const gzippedData = await fetch('/dictionary.gz');
    const decompressedData = gzippedData.body!.pipeThrough(new DecompressionStream('gzip'));
    const textData = await new Response(decompressedData).text();
    const trie = TrieService.createTrie(textData.split('\n') as ReadonlyArray<string>);
    const nodeById = new Map<NodeId, FrozenNode>();
    const allLetters = new Set<Letter>();
    this.freezeTree(trie);
    this.traverseNode(nodeById, allLetters, trie);
    return new Dictionary(trie, nodeById, allLetters);
  }

  static restoreFromSnapshot(snapshot: DictionarySnapshot): Dictionary {
    return new Dictionary(snapshot.trie, snapshot.nodeById, snapshot.allLetters);
  }

  private static freezeTree(node: FrozenNode): void {
    for (const child of node.children.values()) this.freezeTree(child);
    Object.freeze(node.children);
    Object.freeze(node);
  }

  private static traverseNode(nodeById: Map<NodeId, FrozenNode>, allLetters: Set<Letter>, node: FrozenNode): void {
    nodeById.set(node.id, node);
    for (const [childLetter, childNode] of node.children) {
      allLetters.add(childLetter);
      this.traverseNode(nodeById, allLetters, childNode);
    }
  }

  containsAllWords(words: ReadonlyArray<string>): boolean {
    if (words.length === 0) throw new Error('Words array is empty');
    return words.every(word => this.containsWord(word));
  }

  createNextNodeGenerator({ startNode }: { startNode: NodeId }): NextNodeGenerator {
    const node = this.findNodeById(startNode);
    function* generator(node: FrozenNode): Generator<[Letter, NodeId]> {
      for (const [possibleNextLetter, nodeForPossibleNextLetter] of node.children) {
        yield [possibleNextLetter, nodeForPossibleNextLetter.id] as [Letter, NodeId];
      }
    }
    return generator(node);
  }

  getNode(word: string, startNode: NodeId = this.rootNodeId): NodeId | null {
    const node = this.findNodeForWord(word, startNode);
    return node ? node.id : null;
  }

  isNodeFinal(node: NodeId): boolean {
    return this.findNodeById(node).isFinal;
  }

  private containsWord(word: string): boolean {
    const node = this.findNodeForWord(word);
    return node?.isFinal || false;
  }

  private findNodeById(nodeId: NodeId): FrozenNode {
    const node = this.nodeById.get(nodeId);
    if (!node) throw new ReferenceError(`Node not found: ${nodeId}`);
    return node;
  }

  private findNodeForWord(word: string, startNodeId: NodeId = this.rootNodeId): FrozenNode | null {
    let currentNode = this.findNodeById(startNodeId);
    for (let i = 0; i < word.length; i++) {
      const letter = word[i] as Letter;
      const nextNode = currentNode.children.get(letter);
      if (!nextNode) return null;
      currentNode = nextNode;
    }
    return currentNode;
  }
}
