import { Letter } from '@/domain/enums.ts';

export type NodeId = number;

export type FrozenNode = {
  readonly id: NodeId;
  readonly isFinal: boolean;
  readonly children: ReadonlyMap<Letter, FrozenNode>;
};
