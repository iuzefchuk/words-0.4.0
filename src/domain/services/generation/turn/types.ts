import { GameAxis, GameLetter } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import CrossCheckService from '@/domain/services/cross-check/CrossCheckService.ts';
import { GenerationCommandType, GenerationDirection, GenerationTask } from '@/domain/services/generation/turn/enums.ts';
import {
  GameAnchorCoordinates,
  GameCell,
  GameLink,
  GameNode,
  GameTile,
  GameTileCollection,
  GameValidResult,
} from '@/domain/types/index.ts';

export type ApplyTask = {
  candidate: Candidate;
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
  traversal: Traversal;
  type: GenerationTask.ApplyResolution;
};

export type CalculateTask = { traversal: Traversal; type: GenerationTask.CalculateCandidate };

export type Candidate = { cell: GameCell; position: number; resolution: Resolution | undefined };

export type ContinueTaskCommand = { newTasks: Array<Task>; type: GenerationCommandType.ContinueExecute };

export type DispatcherComputeds = { axisCells: ReadonlyArray<GameCell>; oppositeAxis: GameAxis };

export type DispatcherState = { placement: Array<GameLink>; tiles: MutableTileCollection };

export type EvaluateTask = { traversal: Traversal; type: GenerationTask.EvaluateTraversal };

export type GeneratorArguments = {
  context: GeneratorContext;
  coords: GameAnchorCoordinates;
  crossChecker: CrossCheckService;
  playerTileCollection: GameTileCollection;
};

export type GeneratorContext = { dictionary: Dictionary } & GeneratorContextData;

export type GeneratorContextData = { readonly board: Board; readonly inventory: Inventory; readonly turns: Turns };

export type GeneratorPartition = { length: number; offset: number };

export type GeneratorResult = {
  cells: ReadonlyArray<GameCell>;
  tiles: ReadonlyArray<GameTile>;
  validationResult: GameValidResult;
};

export type MutableTileCollection = Map<GameLetter, Array<GameTile>>;

export type Resolution = { tile: GameTile };

export type ResolutionComputeds = { letterTiles: Array<GameTile> };

export type ResolveTask = { candidate: Candidate; traversal: Traversal; type: GenerationTask.ResolveCandidate };

export type ReturnTaskCommand = { result: GeneratorResult; type: GenerationCommandType.ReturnResult };

export type ReverseTask = {
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
  traversal: Traversal;
  type: GenerationTask.ReverseResolution;
};

export type StopTaskCommand = { type: GenerationCommandType.StopExecute };

export type Task = ApplyTask | CalculateTask | EvaluateTask | ResolveTask | ReverseTask | ValidateTask;

export type TaskCommand = ContinueTaskCommand | ReturnTaskCommand | StopTaskCommand;

export type Traversal = { direction: GenerationDirection; node: GameNode; position: number };

export type ValidateTask = { traversal: Traversal; type: GenerationTask.ValidateTraversal };
