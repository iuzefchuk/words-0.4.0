import { FrozenNode, Dictionary } from '@/domain/Dictionary/Dictionary.js';
import { Letter, TileId, Inventory, TileCollection } from '@/domain/Inventory/Inventory.js';
import { CellIndex, Layout, Coordinates, Axis } from '@/domain/Layout/Layout.js';
import { TurnManager, Placement, StateType } from '../Turn.js';
import { StateComputer } from './StateComputer.js';
import { CachedUsableLettersComputer } from './UsableLettersComputer.js';

type BaseTask = {
  state: { position: number; direction: Direction; node: FrozenNode };
};
type ContinuatedTask = BaseTask & {
  continuation: { nextPosition: number; nextCell: CellIndex; nextTile?: TileId };
};
type IteratedTask = ContinuatedTask & {
  iteration: { childNodeIterator: Iterator<[Letter, FrozenNode]>; usableLetters: ReadonlySet<Letter> };
};
type LinkedTask = IteratedTask & {
  link: { letter: Letter; tile: TileId };
};

type InitiateTask = BaseTask & { type: TaskType.Initiate };
type ValidateTask = BaseTask & { type: TaskType.Validate };
type CalculateContinuationTask = BaseTask & { type: TaskType.CalculateContinuation };
type ContinueTask = ContinuatedTask & { type: TaskType.Continue };
type AddLinkTask = IteratedTask & { type: TaskType.AddLink };
type RemoveLinkTask = LinkedTask & { type: TaskType.RemoveLink };

type Task = InitiateTask | ValidateTask | CalculateContinuationTask | ContinueTask | AddLinkTask | RemoveLinkTask;

enum TaskType {
  Initiate = 'Initiate',
  Validate = 'Validate',
  CalculateContinuation = 'CalculateContinuation',
  Continue = 'Continue',
  AddLink = 'AddLink',
  RemoveLink = 'RemoveLink',
}

enum Direction {
  Left = 'Left',
  Right = 'Right',
}

const STEPS: Record<Direction, -1 | 1> = {
  [Direction.Left]: -1,
  [Direction.Right]: 1,
};

export class PlacementComputer {
  constructor(
    private readonly layout: Layout,
    private readonly dictionary: Dictionary,
    private readonly inventory: Inventory,
    private readonly turnManager: TurnManager,
    private readonly cachedUsableLettersComputer: CachedUsableLettersComputer,
  ) {}

  execute({
    playerTileCollection,
    coords,
  }: {
    playerTileCollection: TileCollection;
    coords: Coordinates;
  }): Placement | null {
    const axisCells = this.layout.getAxisCells(coords);
    const oppositeAxis = this.layout.getOppositeAxis(coords.axis);
    const startPosition = axisCells.indexOf(coords.cell);
    if (startPosition === -1) return null;
    const tiles = new Map(playerTileCollection);
    const newPlacement: Placement = [];
    const pendingTasks: Array<Task> = [
      {
        type: TaskType.Initiate,
        state: { position: startPosition, direction: Direction.Left, node: this.dictionary.rootNode },
      },
    ];
    while (pendingTasks.length > 0) {
      const task = pendingTasks.pop()!;
      if (task.type === TaskType.Initiate) {
        const { direction, node } = task.state;
        const placementIsUsable = newPlacement.length > 0 && node.isFinal;
        if (direction === Direction.Right && placementIsUsable) {
          const potentialTurnState = StateComputer.execute(
            newPlacement,
            this.layout,
            this.dictionary,
            this.inventory,
            this.turnManager,
          );
          if (potentialTurnState.type === StateType.Valid) return newPlacement;
        }
        if (direction === Direction.Left) {
          pendingTasks.push({ type: TaskType.Initiate, state: { ...task.state, direction: Direction.Right } });
        }
        pendingTasks.push({ ...task, type: TaskType.Validate });
      }
      if (task.type === TaskType.Validate) this.validate(pendingTasks, task);
      if (task.type === TaskType.CalculateContinuation) this.calculateContinuation(pendingTasks, task, axisCells);
      if (task.type === TaskType.Continue) this.continue(pendingTasks, task, oppositeAxis);
      if (task.type === TaskType.AddLink) this.addLink(pendingTasks, task, tiles, newPlacement);
      if (task.type === TaskType.RemoveLink) this.removeLink(task, tiles, newPlacement);
    }
    return null;
  }

  private validate(pendingTasks: Array<Task>, task: ValidateTask): void {
    const { position, direction } = task.state;
    const isEdge =
      STEPS[direction] === -1
        ? this.layout.isCellPositionOnLeftEdge(position)
        : this.layout.isCellPositionOnRightEdge(position);
    if (!isEdge) pendingTasks.push({ ...task, type: TaskType.CalculateContinuation });
  }

  private calculateContinuation(
    pendingTasks: Array<Task>,
    task: CalculateContinuationTask,
    axisCells: ReadonlyArray<CellIndex>,
  ): void {
    const { position, direction } = task.state;
    const nextPosition = position + STEPS[direction];
    const nextCell = axisCells[nextPosition];
    const nextTile = this.turnManager.findTileByCell(nextCell);
    pendingTasks.push({ ...task, type: TaskType.Continue, continuation: { nextPosition, nextCell, nextTile } });
  }

  private continue(pendingTasks: Array<Task>, task: ContinueTask, oppositeAxis: Axis): void {
    const { node } = task.state;
    const { nextPosition, nextCell, nextTile } = task.continuation;
    if (nextTile) {
      const letter = this.inventory.getTileLetter(nextTile);
      const nextNode = node.children.get(letter);
      if (!nextNode) return;
      pendingTasks.push({ type: TaskType.Initiate, state: { ...task.state, position: nextPosition, node: nextNode } });
    } else {
      const childNodeIterator = node.children.entries();
      const usableLetters = this.cachedUsableLettersComputer.getFor({ axis: oppositeAxis, cell: nextCell });
      pendingTasks.push({ ...task, type: TaskType.AddLink, iteration: { childNodeIterator, usableLetters } });
    }
  }

  private addLink(pendingTasks: Array<Task>, task: AddLinkTask, tiles: TileCollection, newPlacement: Placement): void {
    const { nextPosition, nextCell } = task.continuation;
    const { childNodeIterator, usableLetters } = task.iteration;
    const next = childNodeIterator.next();
    if (next.done) return;
    const [letter, nextNode] = next.value;
    pendingTasks.push(task); // re-queueing the same task to continue iteration
    if (!usableLetters.has(letter)) return;
    const letterTiles = tiles.get(letter);
    if (!letterTiles || letterTiles.length === 0) return;
    const tile = letterTiles.pop();
    if (!tile) throw new Error('Tile has to be present');
    newPlacement.push({ cell: nextCell, tile });
    pendingTasks.push({ ...task, type: TaskType.RemoveLink, link: { letter, tile } });
    pendingTasks.push({ type: TaskType.Initiate, state: { ...task.state, position: nextPosition, node: nextNode } });
  }

  private removeLink(task: RemoveLinkTask, tiles: TileCollection, newPlacement: Placement): void {
    const { letter, tile } = task.link;
    const letterTiles = tiles.get(letter);
    if (!letterTiles) throw new Error('Letter tiles have to be present');
    letterTiles.push(tile);
    newPlacement.pop();
  }
}
