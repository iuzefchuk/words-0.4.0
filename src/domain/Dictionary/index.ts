import { Letter } from '@/domain/enums.js';
import { SORTED_WORDS } from '@/domain/Dictionary/constants.js';
import { FrozenNode, NodeId } from '@/domain/Dictionary/types/local.js';
import { Entry, NextEntryGenerator } from '@/domain/Dictionary/types/shared.js';
import NodeTreeBuilder from '@/domain/Dictionary/construction/NodeTreeBuilder.js';

export default class Dictionary {
  private constructor(
    private readonly nodeTree: FrozenNode,
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
    const allLetters = new Set<Letter>();
    this.populateLetterSetFromNode(allLetters, nodeTree);
    return new Dictionary(nodeTree, allLetters);
  }

  private static populateLetterSetFromNode(set: Set<Letter>, node: FrozenNode): void {
    for (const [childLetter, childNode] of node.children) {
      if (!set.has(childLetter)) set.add(childLetter);
      this.populateLetterSetFromNode(set, childNode);
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
    const search = (node: FrozenNode): FrozenNode => {
      if (node.id === nodeId) return node;
      for (const childNode of node.children.values()) {
        const found = search(childNode);
        if (found) return found;
      }
      throw new Error('Node not found');
    };
    return search(this.rootNode);
  }
}
