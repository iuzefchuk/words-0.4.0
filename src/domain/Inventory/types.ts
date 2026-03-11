import { Letter } from '@/domain/enums.ts';
import InventoryClass from '@/domain/Inventory/index.ts';

export type Inventory = InventoryClass;

export type TileId = string;

export type TileCollection = Map<Letter, Array<TileId>>;
