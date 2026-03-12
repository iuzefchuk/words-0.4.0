import { GameContext, Placement } from '@/domain/types.ts';
import { ValidationStatus } from '@/domain/enums.ts';
import { Board } from '@/domain/model/Board/types.ts';
import Dictionary from '@/domain/reference/Dictionary/index.ts';
import Inventory from '@/domain/model/Inventory/index.ts';
import { TileCollection } from '@/domain/model/Inventory/types.ts';
import TurnValidator from '@/domain/services/Validation/index.ts';
import { GenerationDirection, GenerationTask, GenerationCommandType } from '@/domain/services/Generation/enums.ts';
import {
  GeneratorArguments,
  Traversal,
  Candidate,
  Resolution,
  ResolutionComputeds,
  EvaluateTask,
  ValidateTask,
  CalculateTask,
  ResolveTask,
  ApplyTask,
  ReverseTask,
  Task,
  ContinueTaskCommand,
  ReturnTaskCommand,
  StopTaskCommand,
  TaskCommand,
  DispatcherState,
  DispatcherComputeds,
  GenerationResult,
} from '@/domain/services/Generation/types.ts';
import AnchorLettersComputer from '@/domain/services/Generation/AnchorLettersComputer.ts';

export default class PlacementGenerator {
  static *execute(args: GeneratorArguments): Generator<GenerationResult> {
    const { context, coords } = args;
    const { dictionary } = context;
    const dispatcher = PlacementGenerator.TaskDispatcher.create(args);
    const firstTask: EvaluateTask = {
      type: GenerationTask.EvaluateTraversal,
      traversal: {
        position: dispatcher.computeds.axisCells.indexOf(coords.cell),
        direction: GenerationDirection.Left,
        node: dictionary.firstNode,
      },
    };
    const resolver = PlacementGenerator.TaskCommandResolver.create(firstTask);
    yield* resolver.execute(task => dispatcher.execute(task));
  }

  private static TaskCommandResolver = class TaskCommandResolver {
    private constructor(private readonly stack: Array<Task>) {}

    static create(firstTask: Task): TaskCommandResolver {
      const tasks = [firstTask];
      return new TaskCommandResolver(tasks);
    }

    *execute(dispatcher: (task: Task) => TaskCommand): Generator<GenerationResult> {
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

    static continueExecute(newTasks: Array<Task>): ContinueTaskCommand {
      return { type: GenerationCommandType.ContinueExecute, newTasks };
    }

    static stopExecute(): StopTaskCommand {
      return { type: GenerationCommandType.StopExecute };
    }

    static returnResult(result: GenerationResult): ReturnTaskCommand {
      return { type: GenerationCommandType.ReturnResult, result };
    }
  };

  private static TaskDispatcher = class TaskDispatcher {
    private constructor(
      private readonly context: GameContext,
      private readonly lettersComputer: AnchorLettersComputer,
      private state: DispatcherState,
      public computeds: DispatcherComputeds,
    ) {}

    private get board(): Board {
      return this.context.board;
    }
    private get dictionary(): Dictionary {
      return this.context.dictionary;
    }
    private get inventory(): Inventory {
      return this.context.inventory;
    }

    private get placement(): Placement {
      return this.state.placement;
    }

    private get tiles(): TileCollection {
      return this.state.tiles;
    }

    static create({ context, lettersComputer, playerTileCollection, coords }: GeneratorArguments): TaskDispatcher {
      const state: DispatcherState = { tiles: new Map(playerTileCollection), placement: Placement.create() };
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

    private emitContinue(newTasks: Array<Task> = []): ContinueTaskCommand {
      return PlacementGenerator.TaskCommandResolver.continueExecute(newTasks);
    }

    private emitStop(): StopTaskCommand {
      return PlacementGenerator.TaskCommandResolver.stopExecute();
    }

    private emitReturn(result: GenerationResult): ReturnTaskCommand {
      return PlacementGenerator.TaskCommandResolver.returnResult(result);
    }

    private evaluateTraversal(task: EvaluateTask): ReturnTaskCommand | ContinueTaskCommand {
      const { traversal } = task;
      const placementIsUsable = this.placement.length > 0 && this.dictionary.isNodeFinal(traversal.node);
      if (traversal.direction === GenerationDirection.Right && placementIsUsable) {
        const validationResult = TurnValidator.execute(this.context, this.placement);
        if (validationResult.status === ValidationStatus.Valid) {
          return this.emitReturn(this.placement);
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
      return newTasks.length === 0 ? this.emitStop() : this.emitContinue(newTasks);
    }

    private applyResolution(task: ApplyTask): ContinueTaskCommand {
      const { cell } = task.candidate;
      const { tile } = task.resolution;
      const { letterTiles } = task.resolutionComputeds;
      letterTiles.splice(letterTiles.indexOf(tile), 1);
      this.placement.push({ cell, tile });
      return this.emitContinue();
    }

    private reverseResolution(task: ReverseTask): ContinueTaskCommand {
      const { tile } = task.resolution;
      const { letterTiles } = task.resolutionComputeds;
      letterTiles.push(tile);
      this.placement.pop();
      return this.emitContinue();
    }
  };
}
