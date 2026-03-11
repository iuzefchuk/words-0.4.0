import { Letter } from '@/domain/enums.ts';
import { NodeId } from '@/domain/Dictionary/types/shared.ts';

export type Transition = { parentNode: Node; childLetter: Letter; childNode: Node };

export type Node = { id: NodeId; isFinal: boolean; children: Map<Letter, Node> };

export type FrozenNode = {
  readonly id: NodeId;
  readonly isFinal: boolean;
  readonly children: ReadonlyMap<Letter, FrozenNode>;
};

export type NodeGenerator = Generator<Node, Node>;
