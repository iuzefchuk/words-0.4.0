import { DICTIONARY_DATA } from '@/domain/constants.ts';
import { Letter } from '@/domain/enums.ts';

export type DictionarySnapshot = {
  readonly allLetters: ReadonlySet<Letter>;
  readonly nodeById: ReadonlyMap<NodeId, FrozenNode>;
  readonly rootNode: FrozenNode;
};

export type NodeId = number;

type FrozenNode = {
  readonly children: ReadonlyMap<Letter, FrozenNode>;
  readonly id: NodeId;
  readonly isFinal: boolean;
};

type NextNodeGenerator = Generator<[Letter, NodeId]>;

type Node = { children: Map<Letter, Node>; id: NodeId; isFinal: boolean };

class DictionaryTreeBuilder {
  private currentId: NodeId = 0;

  static execute(sortedWords: ReadonlyArray<string>): Node {
    const builder = new DictionaryTreeBuilder();
    return builder.build(sortedWords);
  }

  private build(sortedWords: ReadonlyArray<string>): Node {
    const rootNode = this.createNode();
    const stack: Array<Node> = [rootNode];
    let previousWord = '';
    for (const word of sortedWords) {
      const commonPrefixLength = this.getCommonPrefixLength(previousWord, word);
      if (previousWord.length > 0) {
        stack[stack.length - 1].isFinal = true;
      }
      while (stack.length > commonPrefixLength + 1) {
        stack.pop();
      }
      for (let i = commonPrefixLength; i < word.length; i++) {
        const childNode = this.createNode();
        stack[stack.length - 1].children.set(word[i] as Letter, childNode);
        stack.push(childNode);
      }
      previousWord = word;
    }
    if (stack.length > 1) {
      stack[stack.length - 1].isFinal = true;
    }
    return rootNode;
  }

  private createNode(): Node {
    return { children: new Map(), id: this.currentId++, isFinal: false };
  }

  private getCommonPrefixLength(a: string, b: string): number {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }
}

export default class Dictionary {
  get firstNode(): NodeId {
    return this.rootNode.id;
  }

  get snapshot(): DictionarySnapshot {
    return {
      allLetters: this.allLetters,
      nodeById: this.nodeById,
      rootNode: this.rootNode,
    };
  }

  private constructor(
    public readonly rootNode: FrozenNode,
    public readonly nodeById: ReadonlyMap<NodeId, FrozenNode>,
    public readonly allLetters: ReadonlySet<Letter>,
  ) {}

  static create(): Dictionary {
    const rootNode = DictionaryTreeBuilder.execute(DICTIONARY_DATA);
    const nodeById = new Map<NodeId, FrozenNode>();
    const allLetters = new Set<Letter>();
    this.freezeTree(rootNode);
    this.traverseNode(nodeById, allLetters, rootNode);
    return new Dictionary(rootNode, nodeById, allLetters);
  }

  static restoreFromSnapshot(snapshot: DictionarySnapshot): Dictionary {
    return new Dictionary(snapshot.rootNode, snapshot.nodeById, snapshot.allLetters);
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

  containsWords(words: ReadonlyArray<string>): boolean {
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

  getNode(word: string, startNode: NodeId = this.firstNode): NodeId | null {
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
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }

  private findNodeForWord(word: string, startNodeId: NodeId = this.rootNode.id): FrozenNode | null {
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
