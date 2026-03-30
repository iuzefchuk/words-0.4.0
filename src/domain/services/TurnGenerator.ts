import { Letter, Player } from '@/domain/enums.ts';
import Board, { AnchorCoordinates, Axis, CellIndex, Link } from '@/domain/models/Board.ts';
import Dictionary, { NodeId } from '@/domain/models/Dictionary.ts';
import Inventory, { TileCollection, TileId } from '@/domain/models/Inventory.ts';
import Turns, { ValidationStatus } from '@/domain/models/Turns.ts';
import CrossCheckComputer from '@/domain/services/CrossCheckComputer.ts';
import CurrentTurnValidator, { ValidatorContext } from '@/domain/services/CurrentTurnValidator.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

enum GenerationDirection {
  Left = -1,
  Right = 1,
}

enum GenerationTask {
  EvaluateTraversal = 'EvaluateTraversal',
  ValidateTraversal = 'ValidateTraversal',
  CalculateCandidate = 'CalculateCandidate',
  ResolveCandidate = 'ResolveCandidate',
  ApplyResolution = 'ApplyResolution',
  ReverseResolution = 'ReverseResolution',
}

enum GenerationCommandType {
  ContinueExecute = 'ContinueExecute',
  StopExecute = 'StopExecute',
  ReturnResult = 'ReturnResult',
}

export type GeneratorContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turns: Turns;
};

type GeneratorArguments = {
  context: GeneratorContext;
  lettersComputer: CrossCheckComputer;
  playerTileCollection: TileCollection;
  coords: AnchorCoordinates;
  yieldControl: () => Promise<void>;
};

export type GeneratorResult = { tiles: ReadonlyArray<TileId>; cells: ReadonlyArray<CellIndex> };

type Traversal = { position: number; direction: GenerationDirection; node: NodeId };

type Candidate = { position: number; cell: CellIndex; resolution?: Resolution };

type Resolution = { tile: TileId };

type ResolutionComputeds = { letterTiles: Array<TileId> };

type EvaluateTask = { type: GenerationTask.EvaluateTraversal; traversal: Traversal };

type ValidateTask = { type: GenerationTask.ValidateTraversal; traversal: Traversal };

type CalculateTask = { type: GenerationTask.CalculateCandidate; traversal: Traversal };

type ResolveTask = { type: GenerationTask.ResolveCandidate; traversal: Traversal; candidate: Candidate };

type ApplyTask = {
  type: GenerationTask.ApplyResolution;
  traversal: Traversal;
  candidate: Candidate;
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
};

type ReverseTask = {
  type: GenerationTask.ReverseResolution;
  traversal: Traversal;
  resolution: Resolution;
  resolutionComputeds: ResolutionComputeds;
};

type Task = EvaluateTask | ValidateTask | CalculateTask | ResolveTask | ApplyTask | ReverseTask;

type ContinueTaskCommand = { type: GenerationCommandType.ContinueExecute; newTasks: Array<Task> };

type ReturnTaskCommand = { type: GenerationCommandType.ReturnResult; result: GeneratorResult };

type StopTaskCommand = { type: GenerationCommandType.StopExecute };

type TaskCommand = ContinueTaskCommand | ReturnTaskCommand | StopTaskCommand;

type MutableTileCollection = Map<Letter, Array<TileId>>;

type DispatcherState = { tiles: MutableTileCollection; placement: Array<Link> };

type DispatcherComputeds = { axisCells: ReadonlyArray<CellIndex>; oppositeAxis: Axis };

export default class TurnGenerator {
  private static readonly YIELD_INTERVAL = 100;

  private static TaskCommandResolver = class TaskCommandResolver {
    private constructor(private readonly stack: Array<Task>) {}

    static create(firstTask: Task): TaskCommandResolver {
      const tasks = [firstTask];
      return new TaskCommandResolver(tasks);
    }

    static continueExecute(newTasks: Array<Task>): ContinueTaskCommand {
      return { type: GenerationCommandType.ContinueExecute, newTasks };
    }

    static stopExecute(): StopTaskCommand {
      return { type: GenerationCommandType.StopExecute };
    }

    static returnResult(result: GeneratorResult): ReturnTaskCommand {
      return { type: GenerationCommandType.ReturnResult, result };
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

    private pushToStack(tasks: Array<Task>): void {
      for (let i = tasks.length - 1; i >= 0; i--) this.stack.push(tasks[i]);
    }

    private popFromStack(): Task {
      const lastTask = this.stack.pop();
      if (!lastTask) throw new Error('Task has to exist');
      return lastTask;
    }
  };

  private static TaskDispatcher = class TaskDispatcher {
    private constructor(
      private readonly context: GeneratorContext,
      private readonly lettersComputer: CrossCheckComputer,
      private state: DispatcherState,
      public computeds: DispatcherComputeds,
    ) {}

    static create({ context, lettersComputer, playerTileCollection, coords }: GeneratorArguments): TaskDispatcher {
      const tiles: MutableTileCollection = new Map();
      for (const [letter, tileIds] of playerTileCollection) tiles.set(letter, [...tileIds]);
      const state: DispatcherState = { tiles, placement: [] };
      const computeds: DispatcherComputeds = {
        axisCells: context.board.getAxisCells(coords),
        oppositeAxis: context.board.getOppositeAxis(coords.axis),
      };
      return new TaskDispatcher(context, lettersComputer, state, computeds);
    }

    execute(task: Task): TaskCommand {
      switch (task.type) {
        case GenerationTask.EvaluateTraversal:
          return this.evaluateTraversal(task);
        case GenerationTask.ValidateTraversal:
          return this.validateTraversal(task);
        case GenerationTask.CalculateCandidate:
          return this.calculateCandidate(task);
        case GenerationTask.ResolveCandidate:
          return this.resolveCandidate(task);
        case GenerationTask.ApplyResolution:
          return this.applyResolution(task);
        case GenerationTask.ReverseResolution:
          return this.reverseResolution(task);
      }
    }

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

    private emitContinue(newTasks: Array<Task> = []): ContinueTaskCommand {
      return TurnGenerator.TaskCommandResolver.continueExecute(newTasks);
    }

    private emitStop(): StopTaskCommand {
      return TurnGenerator.TaskCommandResolver.stopExecute();
    }

    private emitReturn(result: GeneratorResult): ReturnTaskCommand {
      return TurnGenerator.TaskCommandResolver.returnResult(result);
    }

    private evaluateTraversal(task: EvaluateTask): ReturnTaskCommand | ContinueTaskCommand {
      const { traversal } = task;
      const placementIsUsable = this.placement.length > 0 && this.dictionary.isNodeFinal(traversal.node);
      if (traversal.direction === GenerationDirection.Right && placementIsUsable) {
        const placement = [...this.placement];
        const tiles = placement.map(link => link.tile);
        for (const tile of tiles) this.context.turns.recordPlacedTile(tile);
        const validationResult = CurrentTurnValidator.execute(this.context as ValidatorContext);
        for (const tile of tiles) this.context.turns.undoRecordPlacedTile({ tile });
        if (validationResult.status === ValidationStatus.Valid) {
          for (const link of placement) this.board.undoPlaceTile(link.tile);
          return this.emitReturn({ tiles, cells: placement.map(link => link.cell) });
        }
      }
      const nextTasks: Array<Task> = [];
      if (traversal.direction === GenerationDirection.Left) {
        const oppositeDirectionEvaluationTask: EvaluateTask = {
          type: GenerationTask.EvaluateTraversal,
          traversal: { ...traversal, direction: GenerationDirection.Right },
        };
        nextTasks.push(oppositeDirectionEvaluationTask);
      }
      nextTasks.push({ ...task, type: GenerationTask.ValidateTraversal });
      return this.emitContinue(nextTasks);
    }

    private validateTraversal(task: ValidateTask): StopTaskCommand | ContinueTaskCommand {
      const { traversal } = task;
      const isEdge =
        traversal.direction === GenerationDirection.Left
          ? this.board.isCellPositionOnLeftEdge(traversal.position)
          : this.board.isCellPositionOnRightEdge(traversal.position);
      if (isEdge) return this.emitStop();
      return this.emitContinue([{ ...task, type: GenerationTask.CalculateCandidate }]);
    }

    private calculateCandidate(task: CalculateTask): ContinueTaskCommand {
      const { traversal } = task;
      const position = traversal.position + traversal.direction;
      const cell = this.computeds.axisCells[position];
      const tile = this.board.findTileByCell(cell);
      const resolution: Resolution | undefined = tile ? { tile } : undefined;
      const candidate: Candidate = { position, cell, resolution };
      return this.emitContinue([{ ...task, type: GenerationTask.ResolveCandidate, candidate }]);
    }

    private resolveCandidate(task: ResolveTask): StopTaskCommand | ContinueTaskCommand {
      const { traversal, candidate } = task;
      return candidate.resolution
        ? this.createTraversalFromCandidate(traversal, candidate)
        : this.calculateAndExploreResolution(traversal, candidate);
    }

    private createTraversalFromCandidate(
      traversal: Traversal,
      candidate: Candidate,
    ): StopTaskCommand | ContinueTaskCommand {
      const { position, resolution } = candidate;
      if (!resolution) throw new Error('Resolution has to exist');
      const nextNode = this.dictionary.getNode(this.inventory.getTileLetter(resolution.tile), traversal.node);
      if (!nextNode) return this.emitStop();
      const traversalFromCandidate: Traversal = { ...traversal, position, node: nextNode };
      return this.emitContinue([{ type: GenerationTask.EvaluateTraversal, traversal: traversalFromCandidate }]);
    }

    private calculateAndExploreResolution(
      traversal: Traversal,
      candidate: Candidate,
    ): StopTaskCommand | ContinueTaskCommand {
      const { position, cell } = candidate;
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
          type: GenerationTask.ApplyResolution,
          traversal,
          candidate,
          resolution,
          resolutionComputeds,
        };
        const evaluateTask: EvaluateTask = {
          type: GenerationTask.EvaluateTraversal,
          traversal: { ...traversal, position, node: nodeWithPossibleNextLetter },
        };
        const reverseTask: ReverseTask = {
          type: GenerationTask.ReverseResolution,
          traversal,
          resolution,
          resolutionComputeds,
        };
        newTasks.push(applyTask, evaluateTask, reverseTask);
      }
      if (newTasks.length === 0) return this.emitStop();
      shuffleWithFisherYates(newTasks, 3);
      return this.emitContinue(newTasks);
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

    private reverseResolution(task: ReverseTask): ContinueTaskCommand {
      const { tile } = task.resolution;
      const { letterTiles } = task.resolutionComputeds;
      letterTiles.push(tile);
      this.placement.pop();
      this.board.undoPlaceTile(tile);
      return this.emitContinue();
    }
  };

  static async *execute(
    context: GeneratorContext,
    player: Player,
    yieldControl: () => Promise<void>,
  ): AsyncGenerator<GeneratorResult> {
    const { inventory, board, dictionary, turns } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = board.getAnchorCells(turns.historyHasPriorTurns);
    if (anchorCells.size === 0) return;
    const lettersComputer = new CrossCheckComputer(board, dictionary, inventory);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        yield* this.generate({ context, lettersComputer, playerTileCollection, coords, yieldControl });
      }
    }
  }

  private static async *generate(args: GeneratorArguments): AsyncGenerator<GeneratorResult> {
    const { context, coords, yieldControl } = args;
    const { dictionary } = context;
    const dispatcher = TurnGenerator.TaskDispatcher.create(args);
    const firstTask: EvaluateTask = {
      type: GenerationTask.EvaluateTraversal,
      traversal: {
        position: dispatcher.computeds.axisCells.indexOf(coords.cell),
        direction: GenerationDirection.Left,
        node: dictionary.firstNode,
      },
    };
    const resolver = TurnGenerator.TaskCommandResolver.create(firstTask);
    yield* resolver.execute(task => dispatcher.execute(task), yieldControl);
  }
}
