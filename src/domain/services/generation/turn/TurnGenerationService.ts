import { Letter, Player } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import { Axis } from '@/domain/models/board/enums.ts';
import { AnchorCoordinates, Link } from '@/domain/models/board/types.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import { Tile, TileCollection } from '@/domain/models/inventory/types.ts';
import { ValidationStatus } from '@/domain/models/turns/enums.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import CrossCheckService from '@/domain/services/cross-check/CrossCheckService.ts';
import { GenerationCommandType, GenerationDirection, GenerationTask } from '@/domain/services/generation/turn/enums.ts';
import {
  ApplyTask,
  CalculateTask,
  Candidate,
  ContinueTaskCommand,
  DispatcherComputeds,
  DispatcherState,
  EvaluateTask,
  GeneratorArguments,
  GeneratorContext,
  GeneratorPartition,
  GeneratorResult,
  MutableTileCollection,
  Resolution,
  ResolutionComputeds,
  ResolveTask,
  ReturnTaskCommand,
  ReverseTask,
  StopTaskCommand,
  Task,
  TaskCommand,
  Traversal,
  ValidateTask,
} from '@/domain/services/generation/turn/types.ts';
import TurnValidationService from '@/domain/services/validation/turn/TurnValidationService.ts';
import { ValidatorContext } from '@/domain/services/validation/turn/types.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

class TaskCommandResolver {
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

  *execute(dispatcher: (task: Task) => TaskCommand): Generator<GeneratorResult> {
    while (this.stack.length > 0) {
      const task = this.popFromStack();
      const command = dispatcher(task);
      if (command.type === GenerationCommandType.ContinueExecute) this.pushToStack(command.newTasks);
      if (command.type === GenerationCommandType.ReturnResult) yield command.result;
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
}

class TaskDispatcher {
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
    const anchorLetters = this.crossChecker.execute({ axis: this.computeds.oppositeAxis, cell });
    const newTasks: Array<Task> = [];
    this.dictionary.forEachNodeChild(traversal.node, (possibleNextLetter, nodeWithPossibleNextLetter) => {
      const letterTiles = this.tiles.get(possibleNextLetter) as Array<Tile>;
      if (!anchorLetters.has(possibleNextLetter)) return;
      if (!letterTiles) return;
      const tile = letterTiles.at(-1);
      if (!tile) return;
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
    });
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
    return TaskCommandResolver.continueExecute(newTasks);
  }

  private emitReturn(result: GeneratorResult): ReturnTaskCommand {
    return TaskCommandResolver.returnResult(result);
  }

  private emitStop(): StopTaskCommand {
    return TaskCommandResolver.stopExecute();
  }

  private evaluateTraversal(task: EvaluateTask): ContinueTaskCommand | ReturnTaskCommand {
    const { traversal } = task;
    const placementIsUsable = this.placement.length > 0 && this.dictionary.isNodeFinal(traversal.node);
    if (traversal.direction === GenerationDirection.Right && placementIsUsable) {
      const tiles: Array<Tile> = [];
      for (const link of this.placement) {
        tiles.push(link.tile);
        this.context.turns.addPlacedTile(link.tile);
      }
      const validationResult = TurnValidationService.execute(this.context as ValidatorContext);
      for (const tile of tiles) this.context.turns.removePlacedTile(tile);
      if (validationResult.status === ValidationStatus.Valid) {
        const cells = this.placement.map(link => link.cell);
        return this.emitReturn({ cells, tiles, validationResult });
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
}

export default class TurnGenerationService {
  static createContext(board: Board, dictionary: Dictionary, inventory: Inventory, turns: Turns): GeneratorContext {
    return {
      board: Board.clone(board),
      dictionary,
      inventory,
      turns: Turns.clone(turns),
    };
  }

  static *execute(context: GeneratorContext, player: Player, partition?: GeneratorPartition): Generator<GeneratorResult> {
    const { board, dictionary, inventory } = context;
    const playerTileCollection = inventory.getTileCollectionFor(player);
    if (playerTileCollection.size === 0) return;
    const anchorCells = board.calculateAnchorCells();
    if (anchorCells.size === 0) return;
    const allAnchors = Array.from(anchorCells);
    const anchors = partition ? allAnchors.slice(partition.offset, partition.offset + partition.length) : allAnchors;
    if (anchors.length === 0) return;
    const crossChecker = new CrossCheckService(board, dictionary, inventory);
    for (const cell of anchors) {
      for (const axis of Object.values(Axis)) {
        const coords: AnchorCoordinates = { axis, cell };
        yield* this.generate({ context, coords, crossChecker, playerTileCollection });
      }
    }
  }

  static hydrateContext(data: unknown, dictionary: Dictionary): GeneratorContext {
    const d = data as { board: Board; inventory: Inventory; turns: Turns };
    return {
      board: Board.clone(d.board),
      dictionary,
      inventory: Inventory.clone(d.inventory),
      turns: Turns.clone(d.turns, { createUniqueId: () => '' }),
    };
  }

  private static *generate(args: GeneratorArguments): Generator<GeneratorResult> {
    const { context, coords } = args;
    const { dictionary } = context;
    const dispatcher = TaskDispatcher.create(args);
    const firstTask: EvaluateTask = {
      traversal: {
        direction: GenerationDirection.Left,
        node: dictionary.rootNode,
        position: dispatcher.computeds.axisCells.indexOf(coords.cell),
      },
      type: GenerationTask.EvaluateTraversal,
    };
    const resolver = TaskCommandResolver.create(firstTask);
    yield* resolver.execute(task => dispatcher.execute(task));
  }
}
