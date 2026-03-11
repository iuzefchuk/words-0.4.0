import { Layout } from '@/domain/Layout/types.ts';
import { Dictionary } from '@/domain/Dictionary/types.ts';
import { Inventory } from '@/domain/Inventory/types.ts';
import { Turnkeeper } from '@/domain/Turnkeeper/types.ts';

export type GameContext = {
  layout: Layout;
  dictionary: Dictionary;
  inventory: Inventory;
  turnkeeper: Turnkeeper;
};
