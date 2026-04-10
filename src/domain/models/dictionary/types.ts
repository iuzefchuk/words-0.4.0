import { Letter } from '@/domain/enums.ts';

export type FrozenNode = {
  readonly children: ReadonlyMap<Letter, FrozenNode>;
  readonly isFinal: boolean;
};

export type NextNodeGenerator = Generator<[Letter, FrozenNode]>;

export type Node = { children: Map<Letter, Node>; isFinal: boolean };

export type Trie = FrozenNode;
