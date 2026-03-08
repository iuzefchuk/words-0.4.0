import { Axis, Letter } from '@/domain/enums.ts';
import {
  GenerationDirection as Direction,
  GenerationPhase as Phase,
  GenerationTransitionResultType as TransitionResultType,
} from '@/domain/Turnkeeper/enums.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import { Entry } from '@/domain/Dictionary/types/shared.ts';
import { TileCollection, TileId } from '@/domain/Inventory/types/shared.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';

// TODO revisit naming

export type Computeds = { axisCells: ReadonlyArray<CellIndex>; oppositeAxis: Axis };
export type Context = { tiles: TileCollection; placement: Placement };
export type Cursor = { index: number; direction: Direction; entry: Entry };
export type Target = { index: number; meta: { cell: CellIndex; tile?: TileId } };
export type ResolveResults = { letter: Letter; tile: TileId };

export type ExploreFrame = { phase: Phase.Explore; cursor: Cursor };
export type ValidateBoundsFrame = { phase: Phase.ValidateBounds; cursor: Cursor };
export type CalculateTargetFrame = { phase: Phase.CalculateTarget; cursor: Cursor };
export type ResolveTargetFrame = { phase: Phase.ResolveTarget; cursor: Cursor; target: Target };
export type UndoResolveTargetFrame = {
  phase: Phase.UndoResolveTarget;
  cursor: Cursor;
  results: ResolveResults;
};
export type Frame =
  | ExploreFrame
  | ValidateBoundsFrame
  | CalculateTargetFrame
  | ResolveTargetFrame
  | UndoResolveTargetFrame;

export type ContinueTransitionResult = { type: TransitionResultType.Continue; frames: Array<Frame> };
export type SucceedTransitionResult = { type: TransitionResultType.Success; placement: Placement };
export type FailTransitionResult = { type: TransitionResultType.Fail };
export type TransitionResult = ContinueTransitionResult | SucceedTransitionResult | FailTransitionResult;
