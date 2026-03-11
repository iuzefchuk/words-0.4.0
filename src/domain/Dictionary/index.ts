import { Letter } from '@/domain/enums.ts';
import { SORTED_WORDS } from '@/domain/Dictionary/constants.ts';
import { FrozenNode } from '@/domain/Dictionary/types/local.ts';
import { NodeId, NextNodeGenerator } from '@/domain/Dictionary/types/shared.ts';
import NodeTreeBuilder from '@/domain/Dictionary/construction/NodeTreeBuilder.ts';

export default class Dictionary {
  private constructor(
    private readonly rootNode: FrozenNode,
    private readonly nodeIndex: ReadonlyMap<NodeId, FrozenNode>,
    public readonly allLetters: ReadonlySet<Letter>,
  ) {}

  static create(): Dictionary {
    const rootNode = NodeTreeBuilder.execute(SORTED_WORDS);
    const nodeIndex = new Map<NodeId, FrozenNode>();
    const allLetters = new Set<Letter>();
    this.traverseNode(nodeIndex, allLetters, rootNode);
    return new Dictionary(rootNode, nodeIndex, allLetters);
  }

  private static traverseNode(nodeIndex: Map<NodeId, FrozenNode>, allLetters: Set<Letter>, node: FrozenNode): void {
    nodeIndex.set(node.id, node);
    for (const [childLetter, childNode] of node.children) {
      allLetters.add(childLetter);
      this.traverseNode(nodeIndex, allLetters, childNode);
    }
  }

  get firstNode(): NodeId {
    return this.rootNode.id;
  }

  containsWords(words: ReadonlyArray<string>): boolean {
    return words.every(word => this.containsWord(word));
  }

  containsWord(word: string): boolean {
    const node = this.findNodeForWord(word);
    return node?.isFinal || false;
  }

  getNode(word: string, startNode: NodeId = this.firstNode): NodeId | null {
    const node = this.findNodeForWord(word, startNode);
    return node ? node.id : null;
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

  isNodeFinal(node: NodeId): boolean {
    return this.findNodeById(node).isFinal;
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

  private findNodeById(nodeId: NodeId): FrozenNode {
    const node = this.nodeIndex.get(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }
}
