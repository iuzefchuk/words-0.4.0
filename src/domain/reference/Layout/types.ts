import { Axis } from '@/domain/enums.ts';

export type CellIndex = number;

export type AnchorCoordinates = { readonly axis: Axis; readonly cell: CellIndex };
