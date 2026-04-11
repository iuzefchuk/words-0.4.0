import { Letter } from '@/domain/enums.ts';

export type NextNodeGenerator = Generator<[Letter, ReadonlyNode]>;

export type Node = { children: Map<Letter, Node>; isFinal: boolean };

export type ReadonlyNode = {
  readonly children: ReadonlyMap<Letter, ReadonlyNode>;
  readonly isFinal: boolean;
};

export type Trie = ReadonlyNode;
