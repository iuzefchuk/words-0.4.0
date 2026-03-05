import { Layout } from '@/domain/Layout/types/shared.ts';
import { Dictionary } from '@/domain/Dictionary/types/shared.ts';
import { Inventory } from '@/domain/Inventory/types/shared.ts';
import { Turnkeeper } from '@/domain/Turnkeeper/types/shared.ts';

export type GameContext = {
  layout: Layout;
  dictionary: Dictionary;
  inventory: Inventory;
  turnkeeper: Turnkeeper;
};
