import { Axis } from '@/domain/enums.ts';
import { GameContext, Placement } from '@/domain/types.ts';
import { GenerationDirection, GenerationTask, GenerationCommandType } from '@/domain/Generation/enums.ts';
import { NodeId } from '@/domain/Dictionary/types.ts';
import { TileCollection, TileId } from '@/domain/Inventory/types.ts';
import { AnchorCoordinates, CellIndex } from '@/domain/Board/types.ts';
import AnchorLettersComputer from '@/domain/Generation/AnchorLettersComputer.ts';

export type GeneratorArguments = {
  context: GameContext;
  lettersComputer: AnchorLettersComputer;
  playerTileCollection: TileCollection;
  coords: AnchorCoordinates;
};

export type Traversal = { position: number; direction: GenerationDirection; node: NodeId };
export type Candidate = { position: number; cell: CellIndex; resolution?: Resolution };
export type Resolution = { tile: TileId };
export type ResolutionComputeds = { letterTiles: Array<TileId> };

export type EvaluateTask = {
  type: GenerationTask.EvaluateTraversal;
  traversal: Traversal;
};
export type ValidateTask = {
  type: GenerationTask.ValidateTraversal;
  traversal: Traversal;
};
export type CalculateTask = {
  type: GenerationTask.CalculateCandidate;
  traversal: Traversal;
};
export type ResolveTask = {
  type: GenerationTask.ResolveCandidate;
  traversal: Traversal;
  candidate: Candidate;
};
export type ApplyTask = {
  type: GenerationTask.ApplyResolution;
  traversal: Traversal;
  candidate: Candidate;
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
};
export type ReverseTask = {
  type: GenerationTask.ReverseResolution;
  traversal: Traversal;
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
};
export type Task = EvaluateTask | ValidateTask | CalculateTask | ResolveTask | ApplyTask | ReverseTask;

export type ContinueTaskCommand = { type: GenerationCommandType.ContinueExecute; newTasks: Array<Task> };
export type ReturnTaskCommand = { type: GenerationCommandType.ReturnResult; result: GenerationResult };
export type StopTaskCommand = { type: GenerationCommandType.StopExecute };
export type TaskCommand = ContinueTaskCommand | ReturnTaskCommand | StopTaskCommand;

export type DispatcherState = { tiles: TileCollection; placement: Placement };
export type DispatcherComputeds = { axisCells: ReadonlyArray<CellIndex>; oppositeAxis: Axis };

export type GenerationResult = Placement;
