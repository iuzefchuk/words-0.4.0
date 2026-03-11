import { Axis } from '@/domain/enums.ts';
import LayoutClass from '@/domain/Layout/index.ts';

export type Layout = LayoutClass;

export type CellIndex = number;

export type AnchorCoordinates = { readonly axis: Axis; readonly cell: CellIndex };
