import DATA from './data.js';

type Transition = { parentNode: Node; childNodeChar: string; childNode: Node };

type Node = { id: number; isFinal: boolean; children: Map<string, Node> };

type FrozenNode = {
  readonly id: number;
  readonly isFinal: boolean;
  readonly children: ReadonlyMap<string, FrozenNode>;
};

type NodeGenerator = Generator<Node, Node>;

export class Dictionary {
  private constructor(public readonly rootNode: Readonly<FrozenNode>) {}

  static create(): Dictionary {
    const rootNode = Dictionary.RootNodeFactory.create(DATA);
    return new Dictionary(rootNode);
  }

  static RootNodeFactory = class {
    static create(sortedWords: ReadonlyArray<string>): Readonly<FrozenNode> {
      const generator = this.nodeGenerator();
      const rootNode = generator.next().value;
      const minimizer = new this.TransitionToNodeMinimizer();
      let previousWord = '';
      for (const word of sortedWords) {
        const differenceStartIndex = this.getWordsCommonPrefixLength(word, previousWord);
        minimizer.minimizeQueue({ downTo: differenceStartIndex });
        const initialParentNode =
          differenceStartIndex === 0 ? rootNode : minimizer.getNodeByQueueIndex(differenceStartIndex);
        for (const transition of this.populateNodeFromSubstring(
          initialParentNode,
          word.substring(differenceStartIndex),
          generator,
        )) {
          minimizer.addToQueue(transition);
        }
        previousWord = word;
      }
      minimizer.minimizeQueue({ downTo: 0 });
      return this.freezeNode(rootNode);
    }

    private static freezeNode(node: Node): FrozenNode {
      for (const child of node.children.values()) this.freezeNode(child);
      Object.freeze(node.children);
      return Object.freeze(node) as FrozenNode;
    }

    private static *nodeGenerator(): NodeGenerator {
      let id = 0;
      while (true) yield { id: id++, isFinal: false, children: new Map() };
    }

    private static *populateNodeFromSubstring(
      node: Node,
      wordSubstring: string,
      generator: NodeGenerator,
    ): Generator<Transition> {
      let parentNode = node;
      for (let i = 0; i < wordSubstring.length; i++) {
        const childNodeChar = wordSubstring[i];
        const childNode = generator.next().value;
        parentNode.children.set(childNodeChar, childNode);
        yield { parentNode, childNodeChar, childNode };
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

      addToQueue(node: Transition): void {
        this.transitionsQueue.push(node);
      }

      minimizeQueue({ downTo }: { downTo: number }): void {
        for (let i = this.transitionsQueue.length - 1; i >= downTo; i--) {
          this.minimizeTransition(this.transitionsQueue[i]);
          this.transitionsQueue.pop();
        }
      }

      private minimizeTransition(node: Transition): void {
        const { childNode, childNodeChar, parentNode } = node;
        const childNodeKey = this.createUniqueKeyForNode(childNode);
        const cachedChildNode = this.minimizedNodeCache.get(childNodeKey);
        if (cachedChildNode) {
          parentNode.children.set(childNodeChar, cachedChildNode);
        } else {
          this.minimizedNodeCache.set(childNodeKey, childNode);
        }
      }

      private createUniqueKeyForNode(node: Node): string {
        let key = node.isFinal ? '1' : '0';
        for (const [char, child] of node.children) key += char + child.id;
        return key;
      }
    };
  };

  hasWords(words: ReadonlyArray<string>): boolean {
    return words.every(word => this.hasWord(word));
  }

  hasWord(word: string): boolean {
    let currentNode = this.rootNode;
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      const nextNode = currentNode.children.get(char);
      if (!nextNode) return false;
      currentNode = nextNode;
    }
    return currentNode.isFinal;
  }
}
