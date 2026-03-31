import { Letter, Player } from '@/domain/enums.ts';
import Board, { AnchorCoordinates, Axis, CellIndex, Link } from '@/domain/models/Board.ts';
import Dictionary, { NodeId } from '@/domain/models/Dictionary.ts';
import Inventory, { TileCollection, TileId } from '@/domain/models/Inventory.ts';
import Turns, { ValidationStatus, ValidResult } from '@/domain/models/Turns.ts';
import CrossCheckComputer from '@/domain/services/CrossCheckComputer.ts';
import CurrentTurnValidator, { ValidatorContext } from '@/domain/services/CurrentTurnValidator.ts';
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
  cells: ReadonlyArray<CellIndex>;
  tiles: ReadonlyArray<TileId>;
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

type Candidate = { cell: CellIndex; position: number; resolution?: Resolution };

type ContinueTaskCommand = { newTasks: Array<Task>; type: GenerationCommandType.ContinueExecute };

type DispatcherComputeds = { axisCells: ReadonlyArray<CellIndex>; oppositeAxis: Axis };

type DispatcherState = { placement: Array<Link>; tiles: MutableTileCollection };

type EvaluateTask = { traversal: Traversal; type: GenerationTask.EvaluateTraversal };

type GeneratorArguments = {
  context: GeneratorContext;
  coords: AnchorCoordinates;
  lettersComputer: CrossCheckComputer;
  playerTileCollection: TileCollection;
  yieldControl: () => Promise<void>;
};

type MutableTileCollection = Map<Letter, Array<TileId>>;

type Resolution = { tile: TileId };

type ResolutionComputeds = { letterTiles: Array<TileId> };

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

type Traversal = { direction: GenerationDirection; node: NodeId; position: number };

type ValidateTask = { traversal: Traversal; type: GenerationTask.ValidateTraversal };

export default class TurnGenerator {
  private static readonly YIELD_INTERVAL = 100;

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

    async *execute(
      dispatcher: (task: Task) => TaskCommand,
      yieldControl: () => Promise<void>,
    ): AsyncGenerator<GeneratorResult> {
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
      if (!lastTask) throw new Error('Task has to exist');
      return lastTask;
    }

    private pushToStack(tasks: Array<Task>): void {
      for (let i = tasks.length - 1; i >= 0; i--) this.stack.push(tasks[i]);
    }
  };

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
      private readonly lettersComputer: CrossCheckComputer,
      private state: DispatcherState,
      public computeds: DispatcherComputeds,
    ) {}

    static create({ context, coords, lettersComputer, playerTileCollection }: GeneratorArguments): TaskDispatcher {
      const tiles: MutableTileCollection = new Map();
      for (const [letter, tileIds] of playerTileCollection) tiles.set(letter, [...tileIds]);
      const state: DispatcherState = { placement: [], tiles };
      const computeds: DispatcherComputeds = {
        axisCells: context.board.getAxisCells(coords),
        oppositeAxis: context.board.getOppositeAxis(coords.axis),
      };
      return new TaskDispatcher(context, lettersComputer, state, computeds);
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

    private calculateAndExploreResolution(
      traversal: Traversal,
      candidate: Candidate,
    ): ContinueTaskCommand | StopTaskCommand {
      const { cell, position } = candidate;
      const generator = this.dictionary.createNextNodeGenerator({ startNode: traversal.node });
      const anchorLetters = this.lettersComputer.getFor({ axis: this.computeds.oppositeAxis, cell });
      const newTasks: Array<Task> = [];
      for (const [possibleNextLetter, nodeWithPossibleNextLetter] of generator) {
        const letterTiles = this.tiles.get(possibleNextLetter) as Array<TileId>;
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
      shuffleWithFisherYates(newTasks, 3);
      return this.emitContinue(newTasks);
    }

    private calculateCandidate(task: CalculateTask): ContinueTaskCommand {
      const { traversal } = task;
      const position = traversal.position + traversal.direction;
      const cell = this.computeds.axisCells[position];
      const tile = this.board.findTileByCell(cell);
      const resolution: Resolution | undefined = tile ? { tile } : undefined;
      const candidate: Candidate = { cell, position, resolution };
      return this.emitContinue([{ ...task, candidate, type: GenerationTask.ResolveCandidate }]);
    }

    private createTraversalFromCandidate(
      traversal: Traversal,
      candidate: Candidate,
    ): ContinueTaskCommand | StopTaskCommand {
      const { position, resolution } = candidate;
      if (!resolution) throw new Error('Resolution has to exist');
      const nextNode = this.dictionary.getNode(this.inventory.getTileLetter(resolution.tile), traversal.node);
      if (!nextNode) return this.emitStop();
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
        for (const tile of tiles) this.context.turns.recordPlacedTile(tile);
        const validationResult = CurrentTurnValidator.execute(this.context as ValidatorContext);
        for (const tile of tiles) this.context.turns.undoRecordPlacedTile({ tile });
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
          ? this.board.isCellPositionOnLeftEdge(traversal.position)
          : this.board.isCellPositionOnRightEdge(traversal.position);
      if (isEdge) return this.emitStop();
      return this.emitContinue([{ ...task, type: GenerationTask.CalculateCandidate }]);
    }
  };

  static async *execute(
    context: GeneratorContext,
    player: Player,
    yieldControl: () => Promise<void>,
  ): AsyncGenerator<GeneratorResult> {
    const { board, dictionary, inventory, turns } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = board.getAnchorCells(turns.historyHasPriorTurns);
    if (anchorCells.size === 0) return;
    const lettersComputer = new CrossCheckComputer(board, dictionary, inventory);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        yield* this.generate({ context, coords, lettersComputer, playerTileCollection, yieldControl });
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
        node: dictionary.firstNode,
        position: dispatcher.computeds.axisCells.indexOf(coords.cell),
      },
      type: GenerationTask.EvaluateTraversal,
    };
    const resolver = TurnGenerator.TaskCommandResolver.create(firstTask);
    yield* resolver.execute(task => dispatcher.execute(task), yieldControl);
  }
}
