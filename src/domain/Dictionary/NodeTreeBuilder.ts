import { Letter } from '@/domain/enums.ts';
import { Transition, Node, FrozenNode, NodeGenerator, NodeId } from '@/domain/Dictionary/types.ts';

export default class NodeTreeBuilder {
  private currentId: NodeId = 0;

  static execute(sortedWords: ReadonlyArray<string>): FrozenNode {
    const builder = new NodeTreeBuilder();
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
        const transition: Transition = { parentNode: generator.next().value, childLetter: word[i] as Letter, childNode };
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
