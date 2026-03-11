import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';

export type Link = { readonly cell: CellIndex; readonly tile: TileId };
