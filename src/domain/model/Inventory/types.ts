import { Letter } from '@/domain/enums.ts';
import InventoryClass from '@/domain/model/Inventory/Inventory.ts';

export type Inventory = InventoryClass;

export type TileId = string;

export type TileCollection = Map<Letter, Array<TileId>>;
