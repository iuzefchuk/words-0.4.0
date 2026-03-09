import { Letter } from '@/domain/enums.ts';
import { SORTED_WORDS } from '@/domain/Dictionary/constants.ts';
import { FrozenNode, NodeId } from '@/domain/Dictionary/types/local.ts';
import { Entry, NextEntryGenerator } from '@/domain/Dictionary/types/shared.ts';
import NodeTreeBuilder from '@/domain/Dictionary/construction/NodeTreeBuilder.ts';

export default class Dictionary {
  private constructor(
    private readonly nodeTree: FrozenNode,
    private readonly nodeIndex: ReadonlyMap<NodeId, FrozenNode>,
    public readonly allLetters: ReadonlySet<Letter>,
  ) {}

  private get rootNode(): FrozenNode {
    return this.nodeTree;
  }

  get firstEntry(): Entry {
    return this.rootNode.id;
  }

  static create(): Dictionary {
    const nodeTree = NodeTreeBuilder.execute(SORTED_WORDS);
    const nodeIndex = new Map<NodeId, FrozenNode>();
    const allLetters = new Set<Letter>();
    this.traverseNode(nodeIndex, allLetters, nodeTree);
    return new Dictionary(nodeTree, nodeIndex, allLetters);
  }

  private static traverseNode(nodeIndex: Map<NodeId, FrozenNode>, allLetters: Set<Letter>, node: FrozenNode): void {
    nodeIndex.set(node.id, node);
    for (const [childLetter, childNode] of node.children) {
      if (!allLetters.has(childLetter)) allLetters.add(childLetter);
      this.traverseNode(nodeIndex, allLetters, childNode);
    }
  }

  hasWords(words: ReadonlyArray<string>): boolean {
    return words.every(word => this.hasWord(word));
  }

  hasWord(word: string): boolean {
    const node = this.findNodeForWord(word);
    return node?.isFinal || false;
  }

  findEntryForWord({ word, startEntry = this.firstEntry }: { word: string; startEntry?: Entry }): Entry | null {
    const node = this.findNodeForWord(word, startEntry);
    return node ? node.id : null;
  }

  createNextEntryGenerator({ startEntry }: { startEntry: Entry }): NextEntryGenerator {
    const parentNode = this.findNodeById(startEntry);
    function* generator(node: FrozenNode): Generator<[Letter, Entry]> {
      for (const [possibleNextLetter, nodeForPossibleNextLetter] of node.children) {
        yield [possibleNextLetter, nodeForPossibleNextLetter.id] as [Letter, Entry];
      }
    }
    return generator(parentNode);
  }

  isEntryPlayable(entry: Entry): boolean {
    return this.findNodeById(entry).isFinal;
  }

  private findNodeForWord(word: string, parentNodeId: NodeId = this.rootNode.id): FrozenNode | null {
    let currentNode = this.findNodeById(parentNodeId);
    for (let i = 0; i < word.length; i++) {
      const letter = word[i] as Letter;
      if (!currentNode) return null;
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
