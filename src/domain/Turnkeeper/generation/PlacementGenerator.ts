import { GameContext } from '@/domain/types.ts';
import Dictionary from '@/domain/Dictionary/index.ts';
import Inventory from '@/domain/Inventory/index.ts';
import { TileCollection, TileId } from '@/domain/Inventory/types/shared.ts';
import { Layout } from '@/domain/Layout/types/shared.ts';
import TurnValidator from '@/domain/Turnkeeper/TurnValidator.ts';
import { GenerationDirection, GenerationTask, TaskCommandType, ValidationStatus } from '@/domain/Turnkeeper/enums.ts';
import {
  Arguments,
  DispatcherState,
  DispatcherComputeds,
  Traversal,
  Candidate,
  EvaluateTask,
  ValidateTask,
  CalculateTask,
  ResolveTask,
  DoResolveTask,
  UndoResolveTask,
  Task,
  Result,
  ContinueTaskCommand,
  ReturnTaskCommand,
  StopTaskCommand,
  TaskCommand,
} from '@/domain/Turnkeeper/types/local/generation.ts';
import { CachedAnchorLettersComputer } from '@/domain/Turnkeeper/types/local/index.ts';
import { Placement, Turnkeeper } from '@/domain/Turnkeeper/types/shared.ts';

export default class PlacementGenerator {
  static *execute(args: Arguments): Generator<Result> {
    const { context, coords } = args;
    const { dictionary } = context;
    const dispatcher = PlacementGenerator.TaskDispatcher.create(args);
    const initialTask: EvaluateTask = {
      type: GenerationTask.EvaluateTraversal,
      traversal: {
        index: dispatcher.computeds.axisCells.indexOf(coords.cellIndex),
        direction: GenerationDirection.Left,
        entry: dictionary.firstEntry,
      },
    };
    const commandResolver = PlacementGenerator.TaskCommandResolver.create(initialTask);
    yield* commandResolver.execute(task => dispatcher.execute(task));
  }

  private static TaskCommandResolver = class TaskCommandResolver {
    private constructor(private readonly tasks: Array<Task> = []) {}

    static create(initialTask: Task): TaskCommandResolver {
      const tasks = [initialTask];
      return new TaskCommandResolver(tasks);
    }

    *execute(dispatcher: (task: Task) => TaskCommand): Generator<Result> {
      while (this.tasks.length > 0) {
        const task = this.pop();
        const command = dispatcher(task);
        if (command.type === TaskCommandType.ContinueExecute) this.addTasts(command.newTasks);
        if (command.type === TaskCommandType.ReturnResult) yield command.result;
      }
    }

    private addTasts(tasks: Array<Task>): void {
      for (let i = tasks.length - 1; i >= 0; i--) this.tasks.push(tasks[i]);
    }

    private pop(): Task {
      const lastTask = this.tasks.pop();
      if (!lastTask) throw new Error('Task has to exist');
      return lastTask;
    }

    static continue(newTasks: Array<Task>): ContinueTaskCommand {
      return { type: TaskCommandType.ContinueExecute, newTasks };
    }

    static stop(): StopTaskCommand {
      return { type: TaskCommandType.StopExecute };
    }

    static return(result: Result): ReturnTaskCommand {
      return { type: TaskCommandType.ReturnResult, result };
    }
  };

  private static TaskDispatcher = class TaskDispatcher {
    private constructor(
      private readonly context: GameContext,
      private readonly lettersComputer: CachedAnchorLettersComputer,
      private state: DispatcherState,
      public computeds: DispatcherComputeds,
    ) {}

    private get layout(): Layout {
      return this.context.layout;
    }
    private get dictionary(): Dictionary {
      return this.context.dictionary;
    }
    private get inventory(): Inventory {
      return this.context.inventory;
    }
    private get turnkeeper(): Turnkeeper {
      return this.context.turnkeeper;
    }
    private get placement(): Placement {
      return this.state.placement;
    }
    private get tiles(): TileCollection {
      return this.state.tiles;
    }

    static create({ context, lettersComputer, playerTileCollection, coords }: Arguments): TaskDispatcher {
      const state: DispatcherState = { tiles: new Map(playerTileCollection), placement: [] };
      const computeds: DispatcherComputeds = {
        axisCells: context.layout.getAxisCells(coords),
        oppositeAxis: context.layout.getOppositeAxis(coords.axis),
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
        case GenerationTask.DoResolve:
          return this.doResolve(task);
        case GenerationTask.UndoResolve:
          return this.undoResolve(task);
      }
    }

    private evaluateTraversal(task: EvaluateTask): TaskCommand {
      const { traversal } = task;
      const placementIsUsable = this.placement.length > 0 && this.dictionary.isEntryPlayable(traversal.entry);
      if (traversal.direction === GenerationDirection.Right && placementIsUsable) {
        const validationResult = new TurnValidator(this.context).execute(this.placement);
        if (validationResult.status === ValidationStatus.Valid) {
          return PlacementGenerator.TaskCommandResolver.return(this.placement);
        }
      }
      const tasks: Array<Task> = [];
      if (traversal.direction === GenerationDirection.Left) {
        tasks.push({
          type: GenerationTask.EvaluateTraversal,
          traversal: { ...traversal, direction: GenerationDirection.Right },
        });
      }
      tasks.push({ ...task, type: GenerationTask.ValidateTraversal });
      return PlacementGenerator.TaskCommandResolver.continue(tasks);
    }

    private validateTraversal(task: ValidateTask): TaskCommand {
      const { traversal } = task;
      const isEdge =
        traversal.direction === GenerationDirection.Left
          ? this.layout.isCellPositionOnLeftEdge(traversal.index)
          : this.layout.isCellPositionOnRightEdge(traversal.index);
      if (isEdge) return PlacementGenerator.TaskCommandResolver.stop();
      return PlacementGenerator.TaskCommandResolver.continue([{ ...task, type: GenerationTask.CalculateCandidate }]);
    }

    private calculateCandidate(task: CalculateTask): TaskCommand {
      const { traversal } = task;
      const targetIndex = traversal.index + traversal.direction;
      const cell = this.computeds.axisCells[targetIndex];
      const tile = this.turnkeeper.findTileByCell(cell);
      return PlacementGenerator.TaskCommandResolver.continue([
        {
          ...task,
          type: GenerationTask.ResolveCandidate,
          candidate: { index: targetIndex, cell, connectedTile: tile },
        },
      ]);
    }

    private resolveCandidate(task: ResolveTask): TaskCommand {
      const { traversal, candidate } = task;
      if (candidate.connectedTile) return this.followConnectedTile(traversal, candidate, candidate.connectedTile);
      return this.branchOverLetters(traversal, candidate);
    }

    private followConnectedTile(traversal: Traversal, candidate: Candidate, connectedTile: TileId): TaskCommand {
      const letter = this.inventory.getTileLetter(connectedTile);
      const nextEntry = this.dictionary.findEntryForWord({ word: letter, startEntry: traversal.entry });
      if (!nextEntry) return PlacementGenerator.TaskCommandResolver.stop();
      return PlacementGenerator.TaskCommandResolver.continue([
        {
          type: GenerationTask.EvaluateTraversal,
          traversal: { ...traversal, index: candidate.index, entry: nextEntry },
        },
      ]);
    }

    private branchOverLetters(traversal: Traversal, candidate: Candidate): TaskCommand {
      const generator = this.dictionary.createNextEntryGenerator({ startEntry: traversal.entry });
      const anchorLetters = this.lettersComputer.execute({
        axis: this.computeds.oppositeAxis,
        cellIndex: candidate.cell,
      });
      const branchTasks: Array<Task> = [];
      for (const [possibleNextLetter, entryWithPossibleNextLetter] of generator) {
        const letterTiles = this.tiles.get(possibleNextLetter);
        if (!anchorLetters.has(possibleNextLetter) || !letterTiles || letterTiles.length === 0) {
          continue;
        }
        const tile = letterTiles[letterTiles.length - 1];
        branchTasks.push(
          {
            type: GenerationTask.DoResolve,
            traversal,
            candidate,
            resolution: { letter: possibleNextLetter, tile },
          },
          {
            type: GenerationTask.EvaluateTraversal,
            traversal: { ...traversal, index: candidate.index, entry: entryWithPossibleNextLetter },
          },
          {
            type: GenerationTask.UndoResolve,
            traversal,
            resolution: { letter: possibleNextLetter, tile },
          },
        );
      }
      if (branchTasks.length === 0) return PlacementGenerator.TaskCommandResolver.stop();
      return PlacementGenerator.TaskCommandResolver.continue(branchTasks);
    }

    private doResolve(task: DoResolveTask): TaskCommand {
      const { candidate, resolution } = task;
      const letterTiles = this.tiles.get(resolution.letter)!;
      const tileIndex = letterTiles.indexOf(resolution.tile);
      if (tileIndex !== -1) letterTiles.splice(tileIndex, 1);
      this.placement.push({ cell: candidate.cell, tile: resolution.tile });
      return PlacementGenerator.TaskCommandResolver.continue([]);
    }

    private undoResolve(task: UndoResolveTask): TaskCommand {
      const { letter, tile } = task.resolution;
      this.tiles.get(letter)!.push(tile);
      this.placement.pop();
      return PlacementGenerator.TaskCommandResolver.continue([]);
    }
  };
}
