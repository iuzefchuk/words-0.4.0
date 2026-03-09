import { GameContext } from '@/domain/types.ts';
import Dictionary from '@/domain/Dictionary/index.ts';
import Inventory from '@/domain/Inventory/index.ts';
import { TileCollection } from '@/domain/Inventory/types/shared.ts';
import { Layout, AnchorCoordinates } from '@/domain/Layout/types/shared.ts';
import TurnValidator from '@/domain/Turnkeeper/TurnValidator.ts';
import {
  GenerationDirection as Direction,
  GenerationPhase as Phase,
  GenerationTransitionResultType as TransitionResultType,
  ValidationResultType,
} from '@/domain/Turnkeeper/enums.ts';
import {
  Computeds,
  Context,
  Frame,
  TransitionResult,
  ExploreFrame,
  ValidateBoundsFrame,
  CalculateTargetFrame,
  ResolveTargetFrame,
  UndoResolveTargetFrame,
  ContinueTransitionResult,
  SucceedTransitionResult,
  FailTransitionResult,
} from '@/domain/Turnkeeper/types/local/generation.ts';
import { CachedAnchorLettersComputer } from '@/domain/Turnkeeper/types/local/index.ts';
import { Turnkeeper, Placement } from '@/domain/Turnkeeper/types/shared.ts';

export default class PlacementGenerator {
  constructor(
    private readonly context: GameContext,
    private readonly cachedAnchorLettersComputer: CachedAnchorLettersComputer,
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

  *execute({
    playerTileCollection,
    coords,
  }: {
    playerTileCollection: TileCollection;
    coords: AnchorCoordinates;
  }): Generator<Placement> {
    const computeds: Computeds = {
      axisCells: this.layout.getAxisCells(coords),
      oppositeAxis: this.layout.getOppositeAxis(coords.axis),
    };
    const startIndex = computeds.axisCells.indexOf(coords.index);
    if (startIndex === -1) return;
    const context: Context = { tiles: new Map(playerTileCollection), placement: [] };
    const stack: Array<Frame> = [
      {
        phase: Phase.Explore,
        cursor: { index: startIndex, direction: Direction.Left, entry: this.dictionary.firstEntry },
      },
    ];
    while (stack.length > 0) {
      const frame = stack.pop()!;
      const result = this.transition(frame, context, computeds);
      if (result.type === TransitionResultType.Success) {
        yield [...result.placement];
        continue;
      }
      if (result.type === TransitionResultType.Continue) {
        for (let i = result.frames.length - 1; i >= 0; i--) stack.push(result.frames[i]);
      }
    }
  }

  private transition(frame: Frame, context: Context, computeds: Computeds): TransitionResult {
    switch (frame.phase) {
      case Phase.Explore:
        return this.explore(frame, context);
      case Phase.ValidateBounds:
        return this.validateBounds(frame);
      case Phase.CalculateTarget:
        return this.calculateTarget(frame, computeds);
      case Phase.ResolveTarget:
        return this.resolveTarget(frame, context, computeds);
      case Phase.UndoResolveTarget:
        return this.undoResolveTarget(frame, context);
    }
  }

  private explore(frame: ExploreFrame, context: Context): TransitionResult {
    const { cursor } = frame;
    const placementIsUsable = context.placement.length > 0 && this.dictionary.isEntryPlayable(cursor.entry);
    if (cursor.direction === Direction.Right && placementIsUsable) {
      const validationResult = new TurnValidator(this.context).execute(context.placement);
      if (validationResult.type === ValidationResultType.Valid) {
        return PlacementGenerator.succeedTransition(context.placement);
      }
    }
    const frames: Array<Frame> = [];
    if (cursor.direction === Direction.Left) {
      frames.push({
        phase: Phase.Explore,
        cursor: { ...cursor, direction: Direction.Right },
      });
    }
    frames.push({ ...frame, phase: Phase.ValidateBounds });
    return PlacementGenerator.continueTransition(frames);
  }

  private validateBounds(frame: ValidateBoundsFrame): TransitionResult {
    const { cursor } = frame;
    const isEdge =
      cursor.direction === Direction.Left
        ? this.layout.isCellPositionOnLeftEdge(cursor.index)
        : this.layout.isCellPositionOnRightEdge(cursor.index);
    if (isEdge) return PlacementGenerator.failTransition();
    return PlacementGenerator.continueTransition([{ ...frame, phase: Phase.CalculateTarget }]);
  }

  private calculateTarget(frame: CalculateTargetFrame, computeds: Computeds): TransitionResult {
    const { cursor } = frame;
    const targetIndex = cursor.index + cursor.direction;
    const cell = computeds.axisCells[targetIndex];
    const tile = this.turnkeeper.findTileByCell(cell);
    return PlacementGenerator.continueTransition([
      {
        ...frame,
        phase: Phase.ResolveTarget,
        target: { index: targetIndex, meta: { cell, tile } },
      },
    ]);
  }

  private resolveTarget(frame: ResolveTargetFrame, context: Context, computeds: Computeds): TransitionResult {
    const { cursor, target } = frame;
    if (target.meta.tile) {
      const letter = this.inventory.getTileLetter(target.meta.tile);
      const nextEntry = this.dictionary.findEntryForWord({ word: letter, startEntry: cursor.entry });
      if (!nextEntry) return PlacementGenerator.failTransition();
      return PlacementGenerator.continueTransition([
        { phase: Phase.Explore, cursor: { ...cursor, index: target.index, entry: nextEntry } },
      ]);
    } else {
      const generator = this.dictionary.createNextEntryGenerator({ startEntry: cursor.entry });
      const anchorLetters = this.cachedAnchorLettersComputer.find({
        axis: computeds.oppositeAxis,
        index: target.meta.cell,
      });
      for (const [possibleNextLetter, entryWithPossibleNextLetter] of generator) {
        const letterTiles = context.tiles.get(possibleNextLetter);
        if (!anchorLetters.has(possibleNextLetter) || !letterTiles || letterTiles.length === 0) {
          continue;
        }
        const tile = letterTiles.pop()!;
        context.placement.push({ cell: target.meta.cell, tile });
        return PlacementGenerator.continueTransition([
          { phase: Phase.UndoResolveTarget, cursor, results: { letter: possibleNextLetter, tile } },
          {
            phase: Phase.Explore,
            cursor: { ...cursor, index: target.index, entry: entryWithPossibleNextLetter },
          },
        ]);
      }
      return PlacementGenerator.failTransition();
    }
  }

  private undoResolveTarget(frame: UndoResolveTargetFrame, context: Context): TransitionResult {
    const { letter, tile } = frame.results;
    context.tiles.get(letter)!.push(tile);
    context.placement.pop();
    return PlacementGenerator.continueTransition([]);
  }

  private static continueTransition(frames: Array<Frame>): ContinueTransitionResult {
    return { type: TransitionResultType.Continue, frames };
  }

  private static succeedTransition(placement: Placement): SucceedTransitionResult {
    return { type: TransitionResultType.Success, placement };
  }

  private static failTransition(): FailTransitionResult {
    return { type: TransitionResultType.Fail };
  }
}
