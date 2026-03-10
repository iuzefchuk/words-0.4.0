import { Letter } from '@/domain/enums.ts';
import { TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex, AnchorCoordinates } from '@/domain/Layout/types/shared.ts';

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export type CachedAnchorLettersComputer = { execute(coords: AnchorCoordinates): ReadonlySet<Letter> };
