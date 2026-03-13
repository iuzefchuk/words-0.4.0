import { Letter } from '@/domain/enums.ts';
import { DICTIONARY_DATA } from '@/domain/constants.ts';

export type NodeId = number;

export type NextNodeGenerator = Generator<[Letter, NodeId]>;

type Transition = { parentNode: Node; childLetter: Letter; childNode: Node };

type Node = { id: NodeId; isFinal: boolean; children: Map<Letter, Node> };

type FrozenNode = {
  readonly id: NodeId;
  readonly isFinal: boolean;
  readonly children: ReadonlyMap<Letter, FrozenNode>;
};

type NodeGenerator = Generator<Node, Node>;

export default class Dictionary {
  private constructor(
    private readonly rootNode: FrozenNode,
    private readonly nodeIndex: ReadonlyMap<NodeId, FrozenNode>,
    public readonly allLetters: ReadonlySet<Letter>,
  ) {}

  static create(): Dictionary {
    const rootNode = DictionaryTreeBuilder.execute(DICTIONARY_DATA);
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

class DictionaryTreeBuilder {
  private currentId: NodeId = 0;

  static execute(sortedWords: ReadonlyArray<string>): FrozenNode {
    const builder = new DictionaryTreeBuilder();
    return builder.build(sortedWords);
  }

  private build(sortedWords: ReadonlyArray<string>): FrozenNode {
    const rootNode = this.createNode();
    const generator = this.createNodeGenerator(rootNode);
    generator.next();
    let previousWord = '';
    for (const word of sortedWords) {
      const commonPrefixLength = this.getCommonPrefixLength(previousWord, word);
      const finishedNode = generator.next({ depth: commonPrefixLength }).value;
      if (finishedNode) this.freezeNode(finishedNode);
      for (let i = commonPrefixLength; i < word.length; i++) {
        const childNode = this.createNode();
        const transition: Transition = {
          parentNode: generator.next().value,
          childLetter: word[i] as Letter,
          childNode,
        };
        generator.next(transition);
      }
      previousWord = word;
    }
    const lastNode = generator.return(rootNode).value;
    this.freezeNode(lastNode);
    return rootNode as unknown as FrozenNode;
  }

  private *createNodeGenerator(rootNode: Node): NodeGenerator {
    const stack: Array<Node> = [rootNode];
    while (true) {
      const input: { depth?: number } | Transition | undefined = yield stack[stack.length - 1];
      if (input && 'depth' in input) {
        while (stack.length > (input.depth ?? 0) + 1) {
          const finishedNode = stack.pop()!;
          finishedNode.isFinal = true;
          yield finishedNode;
        }
      } else if (input && 'parentNode' in input) {
        const { parentNode, childLetter, childNode } = input;
        parentNode.children.set(childLetter, childNode);
        stack.push(childNode);
      }
    }
  }

  private createNode(): Node {
    return { id: this.currentId++, isFinal: false, children: new Map() };
  }

  private freezeNode(node: Node): void {
    Object.freeze(node);
    Object.freeze(node.children);
  }

  private getCommonPrefixLength(a: string, b: string): number {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }
}
