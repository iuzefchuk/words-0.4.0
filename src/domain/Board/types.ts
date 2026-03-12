import { Axis } from '@/domain/enums.ts';
import BoardClass from '@/domain/Board/index.ts';

export type Board = BoardClass;

export type CellIndex = number;

export type AnchorCoordinates = { readonly axis: Axis; readonly cell: CellIndex };
