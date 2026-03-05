import { Letter } from '@/domain/enums.ts';
import DictionaryClass from '@/domain/Dictionary/index.ts';
import { NodeId } from '@/domain/Dictionary/types/local.ts';

export type Dictionary = DictionaryClass;

export type Entry = NodeId;

export type NextEntryGenerator = Generator<[Letter, Entry]>;
