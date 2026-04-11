import { Letter, Player } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Cell, Link } from '@/domain/models/board/types.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import { ReadonlyNode } from '@/domain/models/dictionary/types.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import { Tile, TileCollection } from '@/domain/models/inventory/types.ts';
import { ValidationStatus } from '@/domain/models/turns/enums.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import { ValidResult } from '@/domain/models/turns/types.ts';
import CrossCheckService from '@/domain/services/cross-check/CrossCheckService.ts';
import TurnValidationService, { ValidatorContext } from '@/domain/services/turn-validation/TurnValidationService.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

enum GenerationCommandType {
  ContinueExecute = 'ContinueExecute',
  ReturnResult = 'ReturnResult',
  StopExecute = 'StopExecute',
}

enum GenerationDirection {
  Left = -1,
  Right = 1,
}

enum GenerationTask {
  ApplyResolution = 'ApplyResolution',
  CalculateCandidate = 'CalculateCandidate',
  EvaluateTraversal = 'EvaluateTraversal',
  ResolveCandidate = 'ResolveCandidate',
  ReverseResolution = 'ReverseResolution',
  ValidateTraversal = 'ValidateTraversal',
}

export type GeneratorContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turns: Turns;
};

export type GeneratorResult = {
  cells: ReadonlyArray<Cell>;
  tiles: ReadonlyArray<Tile>;
  validationResult: ValidResult;
};

type ApplyTask = {
  candidate: Candidate;
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
  traversal: Traversal;
  type: GenerationTask.ApplyResolution;
};

type CalculateTask = { traversal: Traversal; type: GenerationTask.CalculateCandidate };

type Candidate = { cell: Cell; position: number; resolution: Resolution | undefined };

type ContinueTaskCommand = { newTasks: Array<Task>; type: GenerationCommandType.ContinueExecute };

type DispatcherComputeds = { axisCells: ReadonlyArray<Cell>; oppositeAxis: Axis };

type DispatcherState = { placement: Array<Link>; tiles: MutableTileCollection };

type EvaluateTask = { traversal: Traversal; type: GenerationTask.EvaluateTraversal };

type GeneratorArguments = {
  context: GeneratorContext;
  coords: AnchorCoordinates;
  crossChecker: CrossCheckService;
  playerTileCollection: TileCollection;
  yieldControl: () => Promise<void>;
};

type MutableTileCollection = Map<Letter, Array<Tile>>;

type Resolution = { tile: Tile };

type ResolutionComputeds = { letterTiles: Array<Tile> };

type ResolveTask = { candidate: Candidate; traversal: Traversal; type: GenerationTask.ResolveCandidate };

type ReturnTaskCommand = { result: GeneratorResult; type: GenerationCommandType.ReturnResult };

type ReverseTask = {
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
  traversal: Traversal;
  type: GenerationTask.ReverseResolution;
};

type StopTaskCommand = { type: GenerationCommandType.StopExecute };

type Task = ApplyTask | CalculateTask | EvaluateTask | ResolveTask | ReverseTask | ValidateTask;

type TaskCommand = ContinueTaskCommand | ReturnTaskCommand | StopTaskCommand;

type Traversal = { direction: GenerationDirection; node: ReadonlyNode; position: number };

type ValidateTask = { traversal: Traversal; type: GenerationTask.ValidateTraversal };

export default class TurnGenerator {
  private static readonly YIELD_INTERVAL = 100;

  // TODO to separate service
  private static TaskCommandResolver = class TaskCommandResolver {
    private constructor(private readonly stack: Array<Task>) {}

    static continueExecute(newTasks: Array<Task>): ContinueTaskCommand {
      return { newTasks, type: GenerationCommandType.ContinueExecute };
    }

    static create(firstTask: Task): TaskCommandResolver {
      const tasks = [firstTask];
      return new TaskCommandResolver(tasks);
    }

    static returnResult(result: GeneratorResult): ReturnTaskCommand {
      return { result, type: GenerationCommandType.ReturnResult };
    }

    static stopExecute(): StopTaskCommand {
      return { type: GenerationCommandType.StopExecute };
    }

    async *execute(dispatcher: (task: Task) => TaskCommand, yieldControl: () => Promise<void>): AsyncGenerator<GeneratorResult> {
      let taskCount = 0;
      while (this.stack.length > 0) {
        const task = this.popFromStack();
        const command = dispatcher(task);
        if (command.type === GenerationCommandType.ContinueExecute) this.pushToStack(command.newTasks);
        if (command.type === GenerationCommandType.ReturnResult) yield command.result;
        if (++taskCount % TurnGenerator.YIELD_INTERVAL === 0) await yieldControl();
      }
    }

    private popFromStack(): Task {
      const lastTask = this.stack.pop();
      if (lastTask === undefined) throw new ReferenceError('Task has to exist');
      return lastTask;
    }

    private pushToStack(tasks: Array<Task>): void {
      for (let i = tasks.length - 1; i >= 0; i--) {
        const task = tasks[i];
        if (task === undefined) throw new ReferenceError('Task must be defined');
        this.stack.push(task);
      }
    }
  };

  // TODO to separate service
  private static TaskDispatcher = class TaskDispatcher {
    private get board(): Board {
      return this.context.board;
    }

    private get dictionary(): Dictionary {
      return this.context.dictionary;
    }

    private get inventory(): Inventory {
      return this.context.inventory;
    }

    private get placement(): Array<Link> {
      return this.state.placement;
    }

    private get tiles(): TileCollection {
      return this.state.tiles;
    }

    private constructor(
      private readonly context: GeneratorContext,
      private readonly crossChecker: CrossCheckService,
      private state: DispatcherState,
      public computeds: DispatcherComputeds,
    ) {}

    static create({ context, coords, crossChecker, playerTileCollection }: GeneratorArguments): TaskDispatcher {
      const tiles: MutableTileCollection = new Map();
      for (const [letter, tileIds] of playerTileCollection) tiles.set(letter, [...tileIds]);
      const state: DispatcherState = { placement: [], tiles };
      const computeds: DispatcherComputeds = {
        axisCells: context.board.calculateAxisCells(coords),
        oppositeAxis: context.board.getOppositeAxis(coords.axis),
      };
      return new TaskDispatcher(context, crossChecker, state, computeds);
    }

    execute(task: Task): TaskCommand {
      switch (task.type) {
        case GenerationTask.ApplyResolution:
          return this.applyResolution(task);
        case GenerationTask.CalculateCandidate:
          return this.calculateCandidate(task);
        case GenerationTask.EvaluateTraversal:
          return this.evaluateTraversal(task);
        case GenerationTask.ResolveCandidate:
          return this.resolveCandidate(task);
        case GenerationTask.ReverseResolution:
          return this.reverseResolution(task);
        case GenerationTask.ValidateTraversal:
          return this.validateTraversal(task);
      }
    }

    private applyResolution(task: ApplyTask): ContinueTaskCommand {
      const { cell } = task.candidate;
      const { tile } = task.resolution;
      const { letterTiles } = task.resolutionComputeds;
      letterTiles.pop();
      this.placement.push({ cell, tile } as Link);
      this.board.placeTile(cell, tile);
      return this.emitContinue();
    }

    private calculateAndExploreResolution(traversal: Traversal, candidate: Candidate): ContinueTaskCommand | StopTaskCommand {
      const { cell, position } = candidate;
      const generator = this.dictionary.createNextNodeGenerator({ startNode: traversal.node });
      const anchorLetters = this.crossChecker.execute({ axis: this.computeds.oppositeAxis, cell });
      const newTasks: Array<Task> = [];
      for (const [possibleNextLetter, nodeWithPossibleNextLetter] of generator) {
        const letterTiles = this.tiles.get(possibleNextLetter) as Array<Tile>;
        if (!anchorLetters.has(possibleNextLetter)) continue;
        if (!letterTiles) continue;
        const tile = letterTiles.at(-1);
        if (!tile) continue;
        const resolution: Resolution = { tile };
        const resolutionComputeds: ResolutionComputeds = { letterTiles };
        const applyTask: ApplyTask = {
          candidate,
          resolution,
          resolutionComputeds,
          traversal,
          type: GenerationTask.ApplyResolution,
        };
        const evaluateTask: EvaluateTask = {
          traversal: { ...traversal, node: nodeWithPossibleNextLetter, position },
          type: GenerationTask.EvaluateTraversal,
        };
        const reverseTask: ReverseTask = {
          resolution,
          resolutionComputeds,
          traversal,
          type: GenerationTask.ReverseResolution,
        };
        newTasks.push(applyTask, evaluateTask, reverseTask);
      }
      if (newTasks.length === 0) return this.emitStop();
      shuffleWithFisherYates({ array: newTasks, groupSize: 3 });
      return this.emitContinue(newTasks);
    }

    private calculateCandidate(task: CalculateTask): ContinueTaskCommand {
      const { traversal } = task;
      const position = traversal.position + traversal.direction;
      const cell = this.computeds.axisCells[position];
      if (cell === undefined) throw new ReferenceError('Cell must be defined');
      const tile = this.board.findTileByCell(cell);
      const resolution: Resolution | undefined = tile ? { tile } : undefined;
      const candidate: Candidate = { cell, position, resolution };
      return this.emitContinue([{ ...task, candidate, type: GenerationTask.ResolveCandidate }]);
    }

    private createTraversalFromCandidate(traversal: Traversal, candidate: Candidate): ContinueTaskCommand | StopTaskCommand {
      const { position, resolution } = candidate;
      if (resolution === undefined) throw new ReferenceError('Resolution must be defined');
      const nextNode = this.dictionary.getNode(this.inventory.getTileLetter(resolution.tile), traversal.node);
      if (nextNode === null) return this.emitStop();
      const traversalFromCandidate: Traversal = { ...traversal, node: nextNode, position };
      return this.emitContinue([{ traversal: traversalFromCandidate, type: GenerationTask.EvaluateTraversal }]);
    }

    private emitContinue(newTasks: Array<Task> = []): ContinueTaskCommand {
      return TurnGenerator.TaskCommandResolver.continueExecute(newTasks);
    }

    private emitReturn(result: GeneratorResult): ReturnTaskCommand {
      return TurnGenerator.TaskCommandResolver.returnResult(result);
    }

    private emitStop(): StopTaskCommand {
      return TurnGenerator.TaskCommandResolver.stopExecute();
    }

    private evaluateTraversal(task: EvaluateTask): ContinueTaskCommand | ReturnTaskCommand {
      const { traversal } = task;
      const placementIsUsable = this.placement.length > 0 && this.dictionary.isNodeFinal(traversal.node);
      if (traversal.direction === GenerationDirection.Right && placementIsUsable) {
        const placement = [...this.placement];
        const tiles = placement.map(link => link.tile);
        for (const tile of tiles) this.context.turns.addPlacedTile(tile);
        const validationResult = TurnValidationService.execute(this.context as ValidatorContext);
        for (const tile of tiles) this.context.turns.removePlacedTile(tile);
        if (validationResult.status === ValidationStatus.Valid) {
          return this.emitReturn({ cells: placement.map(link => link.cell), tiles, validationResult });
        }
      }
      const nextTasks: Array<Task> = [];
      if (traversal.direction === GenerationDirection.Left) {
        const oppositeDirectionEvaluationTask: EvaluateTask = {
          traversal: { ...traversal, direction: GenerationDirection.Right },
          type: GenerationTask.EvaluateTraversal,
        };
        nextTasks.push(oppositeDirectionEvaluationTask);
      }
      nextTasks.push({ ...task, type: GenerationTask.ValidateTraversal });
      return this.emitContinue(nextTasks);
    }

    private resolveCandidate(task: ResolveTask): ContinueTaskCommand | StopTaskCommand {
      const { candidate, traversal } = task;
      return candidate.resolution
        ? this.createTraversalFromCandidate(traversal, candidate)
        : this.calculateAndExploreResolution(traversal, candidate);
    }

    private reverseResolution(task: ReverseTask): ContinueTaskCommand {
      const { tile } = task.resolution;
      const { letterTiles } = task.resolutionComputeds;
      letterTiles.push(tile);
      this.placement.pop();
      this.board.undoPlaceTile(tile);
      return this.emitContinue();
    }

    private validateTraversal(task: ValidateTask): ContinueTaskCommand | StopTaskCommand {
      const { traversal } = task;
      const isEdge =
        traversal.direction === GenerationDirection.Left
          ? this.board.isCellPositionAtAxisStart(traversal.position)
          : this.board.isCellPositionAtAxisEnd(traversal.position);
      if (isEdge) return this.emitStop();
      return this.emitContinue([{ ...task, type: GenerationTask.CalculateCandidate }]);
    }
  };

  static async *execute(context: GeneratorContext, player: Player, yieldControl: () => Promise<void>): AsyncGenerator<GeneratorResult> {
    const { board, dictionary, inventory } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = board.calculateAnchorCells();
    if (anchorCells.size === 0) return;
    const crossChecker = new CrossCheckService(board, dictionary, inventory);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        yield* this.generate({ context, coords, crossChecker, playerTileCollection, yieldControl });
      }
    }
  }

  private static async *generate(args: GeneratorArguments): AsyncGenerator<GeneratorResult> {
    const { context, coords, yieldControl } = args;
    const { dictionary } = context;
    const dispatcher = TurnGenerator.TaskDispatcher.create(args);
    const firstTask: EvaluateTask = {
      traversal: {
        direction: GenerationDirection.Left,
        node: dictionary.rootNode,
        position: dispatcher.computeds.axisCells.indexOf(coords.cell),
      },
      type: GenerationTask.EvaluateTraversal,
    };
    const resolver = TurnGenerator.TaskCommandResolver.create(firstTask);
    yield* resolver.execute(task => dispatcher.execute(task), yieldControl);
  }
}
