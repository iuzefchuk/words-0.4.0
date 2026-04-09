import { Letter } from '@/domain/enums.ts';

export type DictionarySnapshot = {
  readonly allLetters: ReadonlySet<Letter>;
  readonly trie: FrozenNode;
};

export type FrozenNode = {
  readonly children: ReadonlyMap<Letter, FrozenNode>;
  readonly isFinal: boolean;
};

export type NextNodeGenerator = Generator<[Letter, FrozenNode]>;

export type Node = { children: Map<Letter, Node>; isFinal: boolean };
