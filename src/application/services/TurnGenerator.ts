import Board, { AnchorCoordinates, CellIndex, Axis, Link } from '@/domain/models/Board.ts';
import Dictionary, { NodeId } from '@/domain/models/Dictionary.ts';
import Inventory, { TileCollection, TileId } from '@/domain/models/Inventory.ts';
import CrossCheckComputer from '@/domain/services/CrossCheckComputer.ts';
import { ValidationStatus } from '@/domain/models/TurnTracker.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import { Player, Letter } from '@/domain/enums.ts';
import { GameContext } from '@/application/Game.ts';
import { shuffleWithFisherYates } from '@/shared/utils.ts';

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

export type TurnGeneratorArguments = {
  context: GameContext;
  lettersComputer: CrossCheckComputer;
  playerTileCollection: TileCollection;
  coords: AnchorCoordinates;
};
export type TurnGeneratorResult = { tiles: ReadonlyArray<TileId>; cells: ReadonlyArray<CellIndex> };
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
export type ReturnTaskCommand = { type: GenerationCommandType.ReturnResult; result: TurnGeneratorResult };
export type StopTaskCommand = { type: GenerationCommandType.StopExecute };
export type TaskCommand = ContinueTaskCommand | ReturnTaskCommand | StopTaskCommand;
type MutableTileCollection = Map<Letter, Array<TileId>>;
export type DispatcherState = { tiles: MutableTileCollection; placement: Array<Link> };
export type DispatcherComputeds = { axisCells: ReadonlyArray<CellIndex>; oppositeAxis: Axis };

/**
 * Generates optimal turns for a given player using a task-based backtracking algorithm.
 *
 * The algorithm works by exploring anchor cells on the board (empty cells adjacent to
 * existing tiles, or the center cell on the first turn). For each anchor, it traverses
 * the dictionary trie in both directions along each axis, attempting to form valid words
 * by placing tiles from the player's inventory.
 *
 * Execution is driven by a stack of discrete tasks rather than recursive function calls.
 * This makes the backtracking explicit and avoids deep call stacks:
 *
 *   1. EvaluateTraversal — Checks if the current placement forms a valid word. If
 *      traversing left, queues a right-direction evaluation to explore both sides of
 *      the anchor. Always queues a ValidateTraversal to continue extending.
 *
 *   2. ValidateTraversal — Guards against board edges. If the next position is valid,
 *      queues a CalculateCandidate.
 *
 *   3. CalculateCandidate — Inspects the next cell. If it already has a tile, creates
 *      a pre-resolved candidate. Otherwise, leaves it unresolved for the next step.
 *
 *   4. ResolveCandidate — For occupied cells, follows the existing tile's letter in
 *      the trie. For empty cells, iterates over all valid letters (filtered by cross-
 *      checks on the perpendicular axis) and queues Apply → Evaluate → Reverse triples
 *      for each possibility.
 *
 *   5. ApplyResolution — Places a tile on the board and removes it from the player's
 *      available tiles. This mutates shared state for the duration of the subtree.
 *
 *   6. ReverseResolution — Undoes the placement after the subtree has been explored,
 *      restoring the tile to the player's collection. This is the backtracking step.
 *
 * The TaskCommandResolver drives execution: it pops tasks from the stack, dispatches
 * them to the TaskDispatcher, and handles the returned command (continue with new tasks,
 * yield a result, or stop the current branch). Results are yielded as a generator,
 * allowing the caller to take the first valid result or collect all possibilities.
 */
export default class TurnGenerator {
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

    static returnResult(result: TurnGeneratorResult): ReturnTaskCommand {
      return { type: GenerationCommandType.ReturnResult, result };
    }

    *execute(dispatcher: (task: Task) => TaskCommand): Generator<TurnGeneratorResult> {
      while (this.stack.length > 0) {
        const task = this.popFromStack();
        const command = dispatcher(task);
        if (command.type === GenerationCommandType.ContinueExecute) this.pushToStack(command.newTasks);
        if (command.type === GenerationCommandType.ReturnResult) yield command.result;
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
      private readonly context: GameContext,
      private readonly lettersComputer: CrossCheckComputer,
      private state: DispatcherState,
      public computeds: DispatcherComputeds,
    ) {}

    static create({ context, lettersComputer, playerTileCollection, coords }: TurnGeneratorArguments): TaskDispatcher {
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

    private emitReturn(result: TurnGeneratorResult): ReturnTaskCommand {
      return TurnGenerator.TaskCommandResolver.returnResult(result);
    }

    private evaluateTraversal(task: EvaluateTask): ReturnTaskCommand | ContinueTaskCommand {
      const { traversal } = task;
      const placementIsUsable = this.placement.length > 0 && this.dictionary.isNodeFinal(traversal.node);
      if (traversal.direction === GenerationDirection.Right && placementIsUsable) {
        const placement = [...this.placement];
        const tiles = placement.map(link => link.tile);
        const validationResult = TurnValidator.execute(this.context, tiles);
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
        const letterTiles = this.tiles.get(possibleNextLetter);
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
      letterTiles.splice(letterTiles.indexOf(tile), 1);
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

  static *execute(context: GameContext, player: Player): Generator<TurnGeneratorResult> {
    const { inventory, board, dictionary, turnDirector } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = board.getAnchorCells(turnDirector.hasPriorTurns);
    if (anchorCells.size === 0) return;
    const lettersComputer = new CrossCheckComputer(board, dictionary, inventory);
    for (const cell of anchorCells) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        for (const links of this.generate({ context, lettersComputer, playerTileCollection, coords })) yield links;
      }
    }
  }

  static *generate(args: TurnGeneratorArguments): Generator<TurnGeneratorResult> {
    const { context, coords } = args;
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
    yield* resolver.execute(task => dispatcher.execute(task));
  }
}
