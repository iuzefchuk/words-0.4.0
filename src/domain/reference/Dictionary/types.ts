import { Letter } from '@/domain/enums.ts';
import DictionaryClass from '@/domain/reference/Dictionary/index.ts';

export type Dictionary = DictionaryClass;

export type NodeId = number;

export type NextNodeGenerator = Generator<[Letter, NodeId]>;

export type Transition = { parentNode: Node; childLetter: Letter; childNode: Node };

export type Node = { id: NodeId; isFinal: boolean; children: Map<Letter, Node> };

export type FrozenNode = {
  readonly id: NodeId;
  readonly isFinal: boolean;
  readonly children: ReadonlyMap<Letter, FrozenNode>;
};

export type NodeGenerator = Generator<Node, Node>;
