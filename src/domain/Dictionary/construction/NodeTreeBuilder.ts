import { Letter } from '@/domain/enums.ts';
import { Transition, Node, FrozenNode, NodeGenerator } from '@/domain/Dictionary/types/local.ts';
import { NodeId } from '@/domain/Dictionary/types/shared.ts';

export default class NodeTreeBuilder {
  static execute(sortedWords: ReadonlyArray<string>): FrozenNode {
    const generator = this.createNodeGenerator();
    const rootNode = generator.next().value;
    const minimizer = new this.TransitionToNodeMinimizer();
    let previousWord = '';
    for (const word of sortedWords) {
      const commonPrefixLength = this.getWordsCommonPrefixLength(word, previousWord);
      minimizer.minimizeAndTruncateQueue({ downTo: commonPrefixLength });
      const branchPoint = commonPrefixLength === 0 ? rootNode : minimizer.getNodeByQueueIndex(commonPrefixLength);
      for (const transition of this.generateTransitionsFromSubstring(
        branchPoint,
        word.substring(commonPrefixLength),
        generator,
      )) {
        minimizer.addToQueue(transition);
      }
      previousWord = word;
    }
    minimizer.minimizeAndTruncateQueue({ downTo: 0 });
    return this.freezeNode(rootNode);
  }

  private static freezeNode(node: Node): FrozenNode {
    for (const child of node.children.values()) this.freezeNode(child);
    Object.freeze(node.children);
    return Object.freeze(node) as FrozenNode;
  }

  private static *createNodeGenerator(): NodeGenerator {
    let id: NodeId = 0;
    while (true) yield { id: id++, isFinal: false, children: new Map() };
  }

  private static *generateTransitionsFromSubstring(
    node: Node,
    wordSubstring: string,
    generator: NodeGenerator,
  ): Generator<Transition> {
    let parentNode = node;
    for (let i = 0; i < wordSubstring.length; i++) {
      const childLetter = wordSubstring[i] as Letter;
      const childNode = generator.next().value;
      parentNode.children.set(childLetter, childNode);
      yield { parentNode, childLetter, childNode };
      parentNode = childNode;
    }
    parentNode.isFinal = true;
  }

  private static getWordsCommonPrefixLength(firstWord: string, secondWord: string): number {
    let length = 0;
    const minLength = Math.min(firstWord.length, secondWord.length);
    while (length < minLength && firstWord[length] === secondWord[length]) length++;
    return length;
  }

  static TransitionToNodeMinimizer = class {
    constructor(
      private transitionsQueue: Array<Transition> = [],
      private minimizedNodeCache: Map<string, Node> = new Map(),
    ) {}

    getNodeByQueueIndex(index: number): Node {
      const node = this.transitionsQueue[index - 1].childNode;
      if (!node) throw new Error('Node not in converter queue');
      return node;
    }

    addToQueue(transition: Transition): void {
      this.transitionsQueue.push(transition);
    }

    minimizeAndTruncateQueue({ downTo }: { downTo: number }): void {
      for (let i = this.transitionsQueue.length - 1; i >= downTo; i--) {
        this.minimizeTransition(this.transitionsQueue[i]);
        this.transitionsQueue.pop();
      }
    }

    private minimizeTransition(transition: Transition): void {
      const { childNode, childLetter, parentNode } = transition;
      const childSignature = this.computeNodeSignature(childNode);
      const cachedChildNode = this.minimizedNodeCache.get(childSignature);
      if (cachedChildNode) {
        parentNode.children.set(childLetter, cachedChildNode);
      } else {
        this.minimizedNodeCache.set(childSignature, childNode);
      }
    }

    private computeNodeSignature(node: Node): string {
      let key = node.isFinal ? '1' : '0';
      for (const [letter, childNode] of node.children) key += letter + childNode.id;
      return key;
    }
  };
}
