import { DICTIONARY_DATA } from '@/domain/constants.ts';
import { Letter } from '@/domain/enums.ts';

export type NodeId = number;

export type NextNodeGenerator = Generator<[Letter, NodeId]>;

export type DictionaryProps = {
  rootNode: FrozenNode;
  nodeById: ReadonlyMap<NodeId, FrozenNode>;
  allLetters: ReadonlySet<Letter>;
};

type Transition = { parentNode: Node; childLetter: Letter; childNode: Node };

type Node = { id: NodeId; isFinal: boolean; children: Map<Letter, Node> };

type FrozenNode = {
  readonly id: NodeId;
  readonly isFinal: boolean;
  readonly children: ReadonlyMap<Letter, FrozenNode>;
};

type NodeGenerator = Generator<Node, Node>;

export default class Dictionary {
  private constructor(readonly props: DictionaryProps) {}

  static create(): Dictionary {
    const rootNode = DictionaryTreeBuilder.execute(DICTIONARY_DATA);
    const nodeById = new Map<NodeId, FrozenNode>();
    const allLetters = new Set<Letter>();
    this.freezeTree(rootNode);
    this.traverseNode(nodeById, allLetters, rootNode);
    const props = { rootNode, nodeById, allLetters } as DictionaryProps;
    return new Dictionary(props);
  }

  static reconstruct(data: unknown): Dictionary {
    return Object.setPrototypeOf(data, Dictionary.prototype) as Dictionary;
  }

  static restoreFromProps(props: DictionaryProps): Dictionary | null {
    if (!(props.nodeById instanceof Map) || !(props.allLetters instanceof Set)) return null;
    this.freezeTree(props.rootNode);
    return new Dictionary(props);
  }

  get allLetters(): ReadonlySet<Letter> {
    return this.props.allLetters;
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

  private get rootNode(): FrozenNode {
    return this.props.rootNode;
  }

  private get nodeById(): ReadonlyMap<NodeId, FrozenNode> {
    return this.props.nodeById;
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
    const node = this.nodeById.get(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);
    return node;
  }
}

class DictionaryTreeBuilder {
  private currentId: NodeId = 0;

  static execute(sortedWords: ReadonlyArray<string>): Node {
    const builder = new DictionaryTreeBuilder();
    return builder.build(sortedWords);
  }

  private build(sortedWords: ReadonlyArray<string>): Node {
    const rootNode = this.createNode();
    const generator = this.createNodeGenerator(rootNode);
    generator.next();
    let previousWord = '';
    for (const word of sortedWords) {
      const commonPrefixLength = this.getCommonPrefixLength(previousWord, word);
      const finishedNode = generator.next({ depth: commonPrefixLength }).value;
      if (finishedNode) {
        finishedNode.isFinal = true;
      }
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
    const lastNode = generator.next({ depth: 0 }).value;
    lastNode.isFinal = true;
    return rootNode;
  }

  private *createNodeGenerator(rootNode: Node): NodeGenerator {
    const stack: Array<Node> = [rootNode];
    while (true) {
      const input: { depth?: number } | Transition | undefined = yield stack[stack.length - 1];
      if (input && 'depth' in input) {
        let finishedNode: Node | undefined;
        while (stack.length > (input.depth ?? 0) + 1) {
          if (!finishedNode) finishedNode = stack.pop()!;
          else stack.pop();
        }
        if (finishedNode) yield finishedNode;
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

  private getCommonPrefixLength(a: string, b: string): number {
    let i = 0;
    while (i < a.length && i < b.length && a[i] === b[i]) i++;
    return i;
  }
}
