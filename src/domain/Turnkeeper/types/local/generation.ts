import { Axis, Letter } from '@/domain/enums.ts';
import { GenerationDirection, GenerationTask, TaskCommandType } from '@/domain/Turnkeeper/enums.ts';
import { Placement } from '@/domain/Turnkeeper/types/shared.ts';
import { Entry } from '@/domain/Dictionary/types/shared.ts';
import { TileCollection, TileId } from '@/domain/Inventory/types/shared.ts';
import { AnchorCoordinates, CellIndex } from '@/domain/Layout/types/shared.ts';
import { GameContext } from '@/domain/types.ts';
import { CachedAnchorLettersComputer } from '@/domain/Turnkeeper/types/local/index.ts';

export type Arguments = {
  context: GameContext;
  lettersComputer: CachedAnchorLettersComputer;
  playerTileCollection: TileCollection;
  coords: AnchorCoordinates;
};

export type Traversal = { index: number; direction: GenerationDirection; entry: Entry };
export type Candidate = { index: number; cell: CellIndex; connectedTile?: TileId };
export type Resolution = { letter: Letter; tile: TileId };

export type EvaluateTask = { type: GenerationTask.EvaluateTraversal; traversal: Traversal };
export type ValidateTask = { type: GenerationTask.ValidateTraversal; traversal: Traversal };
export type CalculateTask = { type: GenerationTask.CalculateCandidate; traversal: Traversal };
export type ResolveTask = { type: GenerationTask.ResolveCandidate; traversal: Traversal; candidate: Candidate };
export type DoResolveTask = {
  type: GenerationTask.DoResolve;
  traversal: Traversal;
  candidate: Candidate;
  resolution: Resolution;
};
export type UndoResolveTask = { type: GenerationTask.UndoResolve; traversal: Traversal; resolution: Resolution };
export type Task = EvaluateTask | ValidateTask | CalculateTask | ResolveTask | DoResolveTask | UndoResolveTask;

export type ContinueTaskCommand = { type: TaskCommandType.ContinueExecute; newTasks: Array<Task> };
export type ReturnTaskCommand = { type: TaskCommandType.ReturnResult; result: Result };
export type StopTaskCommand = { type: TaskCommandType.StopExecute };
export type TaskCommand = ContinueTaskCommand | ReturnTaskCommand | StopTaskCommand;

export type DispatcherState = { tiles: TileCollection; placement: Placement };
export type DispatcherComputeds = { axisCells: ReadonlyArray<CellIndex>; oppositeAxis: Axis };

export type Result = Placement;
