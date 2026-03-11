import { Axis } from '@/domain/enums.ts';
import { GameContext } from '@/domain/types.ts';
import {
  GenerationDirection,
  GenerationTask,
  GenerationCommandType,
  ValidationErrors,
  ValidationStatus,
} from '@/domain/Turnkeeper/enums.ts';
import { NodeId } from '@/domain/Dictionary/types.ts';
import { TileCollection, TileId } from '@/domain/Inventory/types.ts';
import { AnchorCoordinates, CellIndex } from '@/domain/Layout/types.ts';
import TurnkeeperClass from '@/domain/Turnkeeper/index.ts';
import AnchorLettersComputer from '@/domain/Turnkeeper/AnchorLettersComputer.ts';

export type Turnkeeper = TurnkeeperClass;

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export type Placement = Array<Link>;

// Validation types

export type ValidatorArguments = { initialPlacement: Placement };

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacements = { placements: ReadonlyArray<Placement> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };
type Computeds = ComputedSequences & ComputedPlacements & ComputedWords & ComputedScore;
export type ComputedValue = ComputedSequences | ComputedPlacements | ComputedWords | ComputedScore;

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type PendingResult<State> = { status: ValidationStatus.Pending; state: State };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationErrors };
export type ValidResult = { status: ValidationStatus.Valid } & Computeds;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;

export type PipelineInput = { context: GameContext } & ValidatorArguments;
export type PipelineThroughput<State> = PendingResult<State> | InvalidResult;
export type PipelineState<Output extends ComputedValue> = PipelineInput & Output;
export type PipelineOutput = InvalidResult | ValidResult;

export type SequencesOutput = ComputedSequences;
export type PlacementsOutput = SequencesOutput & ComputedPlacements;
export type WordsOutput = PlacementsOutput & ComputedWords;
export type ScoreOutput = WordsOutput & ComputedScore;

// Generation types

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
