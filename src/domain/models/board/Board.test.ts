import { beforeEach, describe, expect, test } from 'vitest';
import Board from '@/domain/models/board/Board.ts';
import { Axis, Bonus, Type } from '@/domain/models/board/enums.ts';
import fixtures from '@/domain/models/board/fixtures.ts';
import BonusService from '@/domain/models/board/services/bonus/BonusService.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { BonusDistribution, Cell, Placement } from '@/domain/models/board/types.ts';
import { GameTile } from '@/domain/types/index.ts';

describe('Board', () => {
  describe.each(fixtures)('for $desc', ({ instance, meta: { placements, unusedCells, unusedTiles } }) => {
    describe('anchorCells', () => {
      test('does not return duplicate cells', () => {
        const result = [...instance.anchorCells];
        const duplicateCells = result.filter((cell, idx) => result.indexOf(cell) !== idx);
        expect(duplicateCells).toEqual([]);
      });
      test('does not return occupied cells', () => {
        const occupiedCells = [...instance.anchorCells].filter(cell => instance.isCellOccupied(cell));
        expect(occupiedCells).toEqual([]);
      });
      if (placements.length === 0) {
        test('returns only CENTER_CELL on empty board', () => {
          expect([...instance.anchorCells]).toEqual([LayoutService.CENTER_CELL]);
        });
      }
      if (placements.length > 0) {
        test('does not return cells w/out adjacent tiles', () => {
          const withoutAdjacentTiles = [...instance.anchorCells].filter(
            cell => !instance.getAdjacentCells(cell).some(adj => instance.isCellOccupied(adj)),
          );
          expect(withoutAdjacentTiles).toEqual([]);
        });
      }
      if (placements.length > 0 && unusedCells.length > 0) {
        test('returns non-empty set on partial board', () => {
          expect(instance.anchorCells.size).toBeGreaterThan(0);
        });
      }
    });
    describe('clone', () => {
      test('returns instance w/ same state', () => {
        expect(Board.clone(instance)).toEqual(instance);
      });
    });
    describe('findCellByTile', () => {
      describe.each(placements)('for placed tile $tile', ({ cell, tile }) => {
        test('returns cell $cell', () => {
          expect(instance.findCellByTile(tile)).toBe(cell);
        });
      });
      describe.each(unusedTiles)('for unplaced tile %s', tile => {
        test('does not return a cell', () => {
          expect(instance.findCellByTile(tile)).toBeUndefined();
        });
      });
    });
    describe('findTileByCell', () => {
      describe.each(placements)('for occupied cell $cell', ({ cell, tile }) => {
        test('returns tile $tile', () => {
          expect(instance.findTileByCell(cell)).toBe(tile);
        });
      });
      describe.each(unusedCells)('for unoccupied cell %i', cell => {
        test('does not return a tile', () => {
          expect(instance.findTileByCell(cell)).toBeUndefined();
        });
      });
    });
    describe('isCellOccupied', () => {
      describe.each(placements)('for occupied cell $cell', ({ cell }) => {
        test('returns true', () => {
          expect(instance.isCellOccupied(cell)).toBe(true);
        });
      });
      describe.each(unusedCells)('for unoccupied cell %i', cell => {
        test('returns false', () => {
          expect(instance.isCellOccupied(cell)).toBe(false);
        });
      });
    });
    describe('isTilePlaced', () => {
      describe.each(placements)('for placed tile $tile', ({ tile }) => {
        test('returns true', () => {
          expect(instance.isTilePlaced(tile)).toBe(true);
        });
      });
      describe.each(unusedTiles)('for unplaced tile %s', tile => {
        test('returns false', () => {
          expect(instance.isTilePlaced(tile)).toBe(false);
        });
      });
    });
    describe('resolvePlacement', () => {
      describe.each(placements)('for $cell and $tile', ({ cell, tile }) => {
        test('resolves placement', () => {
          expect(instance.resolvePlacement([tile])).toEqual([{ cell, tile }]);
        });
      });
      if (placements.length >= 2) {
        test('returns links sorted by cell ascending', () => {
          const tilesInReverseOrder = [...placements].sort((first, second) => second.cell - first.cell).map(({ tile }) => tile);
          const result = instance.resolvePlacement(tilesInReverseOrder);
          const cellsAscending = [...placements].sort((first, second) => first.cell - second.cell).map(({ cell }) => cell);
          expect(result.map(({ cell }) => cell)).toEqual(cellsAscending);
        });
      }
    });
  });
  describe.each(Object.values(Type))('for %s type', type => {
    const randomizer = (): number => 0.5;
    let board: Board;
    let distribution: BonusDistribution;
    beforeEach(() => {
      board = Board.create(type, randomizer);
      distribution = BonusService.createDistribution(type, randomizer);
    });
    describe('create', () => {
      test('assigns bonuses according to distribution type', () => {
        const mismatches = [...distribution.entries()]
          .filter(([cell, bonus]) => board.getBonus(cell) !== bonus)
          .map(([cell, bonus]) => ({ actual: board.getBonus(cell), cell, expected: bonus }));
        expect(mismatches).toEqual([]);
      });
    });
    describe('getBonus', () => {
      test('does not return bonus for cells w/out bonus', () => {
        const distributionCells = new Set(distribution.keys());
        const spurious = board.cells
          .filter(cell => !distributionCells.has(cell) && board.getBonus(cell) !== null)
          .map(cell => ({ actual: board.getBonus(cell), cell }));
        expect(spurious).toEqual([]);
      });
    });
  });
  describe('calculateAxis', () => {
    const xAxisStep = 1;
    const yAxisStep = LayoutService.CELLS_PER_AXIS;
    const inputCell = 112 as Cell;
    const placedTile = 'A' as GameTile;
    let board: Board;
    beforeEach(() => {
      board = Board.create(Type.Preset);
    });
    test('returns default for single cell w/out occupied adjacents', () => {
      expect(board.calculateAxis([inputCell])).toBe(LayoutService.DEFAULT_AXIS);
    });
    test('returns x for single cell w/ first right occupied adjacent', () => {
      board.placeTile(inputCell, placedTile);
      expect(board.calculateAxis([(inputCell - xAxisStep) as Cell])).toBe(Axis.X);
    });
    test('returns x for single cell w/ first left occupied adjacent', () => {
      board.placeTile(inputCell, placedTile);
      expect(board.calculateAxis([(inputCell + xAxisStep) as Cell])).toBe(Axis.X);
    });
    test('returns y for single cell w/ first bottom occupied adjacent', () => {
      board.placeTile(inputCell, placedTile);
      expect(board.calculateAxis([(inputCell - yAxisStep) as Cell])).toBe(Axis.Y);
    });
    test('returns y for single cell w/ first top occupied adjacent', () => {
      board.placeTile(inputCell, placedTile);
      expect(board.calculateAxis([(inputCell + yAxisStep) as Cell])).toBe(Axis.Y);
    });
    test('returns x for horizontal cell combo', () => {
      expect(board.calculateAxis([inputCell, (inputCell + xAxisStep) as Cell, (inputCell + xAxisStep * 2) as Cell])).toBe(Axis.X);
    });
    test('returns y for vertical cell combo', () => {
      expect(board.calculateAxis([inputCell, (inputCell + yAxisStep) as Cell, (inputCell + yAxisStep * 2) as Cell])).toBe(Axis.Y);
    });
    test('throws error for diagonal cell combo', () => {
      expect(() => {
        board.calculateAxis([
          inputCell,
          (inputCell + xAxisStep + yAxisStep) as Cell,
          (inputCell + (xAxisStep + yAxisStep) * 2) as Cell,
        ]);
      }).toThrow();
    });
    test('throws error for unconnected cell combo', () => {
      expect(() => {
        board.calculateAxis([inputCell, 100 as Cell, 200 as Cell]);
      }).toThrow();
    });
  });
  describe('getMultiplierForLetter', () => {
    const board = Board.create(Type.Preset);
    const cellWithoutBonus = board.cells.find(cell => board.getBonus(cell) === null);
    const cellDouble = board.cells.find(cell => board.getBonus(cell) === Bonus.DoubleLetter);
    const cellTriple = board.cells.find(cell => board.getBonus(cell) === Bonus.TripleLetter);
    if (cellWithoutBonus !== undefined) {
      test('returns 1 for cell w/out bonus', () => {
        expect(board.getMultiplierForLetter(cellWithoutBonus)).toBe(1);
      });
    }
    if (cellDouble !== undefined) {
      test('returns greater than 1 for cell w/ double bonus', () => {
        expect(board.getMultiplierForLetter(cellDouble)).toBeGreaterThan(1);
      });
    }
    if (cellTriple !== undefined) {
      test('returns greater than 1 for cell w/ triple bonus', () => {
        expect(board.getMultiplierForLetter(cellTriple)).toBeGreaterThan(1);
      });
    }
    if (cellWithoutBonus !== undefined && cellDouble !== undefined && cellTriple !== undefined) {
      test('returns different values for cells w/ different bonuses', () => {
        expect(board.getMultiplierForLetter(cellWithoutBonus)).not.toBe(board.getMultiplierForLetter(cellDouble));
        expect(board.getMultiplierForLetter(cellWithoutBonus)).not.toBe(board.getMultiplierForLetter(cellTriple));
        expect(board.getMultiplierForLetter(cellDouble)).not.toBe(board.getMultiplierForLetter(cellTriple));
      });
    }
  });
  describe('getMultiplierForWord', () => {
    const board = Board.create(Type.Preset);
    const cellWithoutBonus = board.cells.find(cell => board.getBonus(cell) === null);
    const cellDouble = board.cells.find(cell => board.getBonus(cell) === Bonus.DoubleWord);
    const cellTriple = board.cells.find(cell => board.getBonus(cell) === Bonus.TripleWord);
    if (cellWithoutBonus !== undefined) {
      test('returns 1 for cell w/out bonus', () => {
        expect(board.getMultiplierForWord(cellWithoutBonus)).toBe(1);
      });
    }
    if (cellDouble !== undefined) {
      test('returns greater than 1 for cell w/ double bonus', () => {
        expect(board.getMultiplierForWord(cellDouble)).toBeGreaterThan(1);
      });
    }
    if (cellTriple !== undefined) {
      test('returns greater than 1 for cell w/ triple bonus', () => {
        expect(board.getMultiplierForWord(cellTriple)).toBeGreaterThan(1);
      });
    }
    if (cellWithoutBonus !== undefined && cellDouble !== undefined && cellTriple !== undefined) {
      test('returns different values for cells w/ different bonuses', () => {
        expect(board.getMultiplierForWord(cellWithoutBonus)).not.toBe(board.getMultiplierForWord(cellDouble));
        expect(board.getMultiplierForWord(cellWithoutBonus)).not.toBe(board.getMultiplierForWord(cellTriple));
        expect(board.getMultiplierForWord(cellDouble)).not.toBe(board.getMultiplierForWord(cellTriple));
      });
    }
  });
  describe('buildPlacement', () => {
    const inputCell = 112 as Cell;
    const inputTileA = 'A' as GameTile;
    const inputTileB = 'B' as GameTile;
    const inputTiles = [inputTileA, inputTileB];
    describe.each([
      { axis: Axis.X, step: 1 },
      { axis: Axis.Y, step: LayoutService.CELLS_PER_AXIS },
    ])('for $axis axis', ({ axis, step }) => {
      let board: Board;
      let placement: Placement;
      beforeEach(() => {
        board = Board.create(Type.Preset);
        board.placeTile(inputCell, inputTileA);
        board.placeTile((inputCell + step) as Cell, inputTileB);
        placement = board.buildPlacement({ axis, cell: inputCell }, inputTiles);
      });
      test('returns placement w/ cells on input axis', () => {
        const cellsPerAxis = LayoutService.CELLS_PER_AXIS;
        const cellsOffAxis = placement
          .map(({ cell }) => cell)
          .filter(cell =>
            axis === Axis.X
              ? Math.floor(cell / cellsPerAxis) !== Math.floor(inputCell / cellsPerAxis)
              : cell % cellsPerAxis !== inputCell % cellsPerAxis,
          );
        expect(cellsOffAxis).toEqual([]);
      });
      test('returns placement w/ previous adjacent link', () => {
        const previousCell = (inputCell - step) as Cell;
        const previousTile = 'C' as GameTile;
        board.placeTile(previousCell, previousTile);
        const newPlacement = board.buildPlacement({ axis, cell: inputCell }, inputTiles);
        const previousLinkIdx = newPlacement.findIndex(link => link.cell === previousCell && link.tile === previousTile);
        const firstInputLinkIdx = newPlacement.findIndex(link => link.tile === inputTileA);
        expect(previousLinkIdx).toBeGreaterThanOrEqual(0);
        expect(previousLinkIdx).toBeLessThan(firstInputLinkIdx);
      });
      test('returns placement w/ next adjacent link', () => {
        const nextCell = (inputCell + step * inputTiles.length) as Cell;
        const nextTile = 'C' as GameTile;
        board.placeTile(nextCell, nextTile);
        const newPlacement = board.buildPlacement({ axis, cell: inputCell }, inputTiles);
        const nextLinkIdx = newPlacement.findIndex(link => link.cell === nextCell && link.tile === nextTile);
        const lastInputLinkIdx = newPlacement.findIndex(link => link.tile === inputTileB);
        expect(nextLinkIdx).toBeGreaterThanOrEqual(0);
        expect(nextLinkIdx).toBeGreaterThan(lastInputLinkIdx);
      });
      test('returns placement w/ incrementing cells according to axis step', () => {
        const outputCells = placement.map(({ cell }) => cell);
        const [firstOutputCell] = outputCells;
        if (firstOutputCell === undefined) throw new ReferenceError('first output cell must be defined');
        const expectedOutputCells = outputCells.map((_, idx) => firstOutputCell + idx * step);
        expect(outputCells).toEqual(expectedOutputCells);
      });
      test('returns placement w/ all input tiles', () => {
        const outputTiles = placement.map(({ tile }) => tile);
        const missingInputTiles = inputTiles.filter(tile => !outputTiles.includes(tile));
        expect(missingInputTiles).toEqual([]);
      });
      test('returns placement w/ input cell', () => {
        expect(placement.map(({ cell }) => cell)).toContain(inputCell);
      });
      test('returns placement w/ all unique cells', () => {
        const outputCells = placement.map(({ cell }) => cell);
        expect(new Set(outputCells).size).toBe(outputCells.length);
      });
      test('returns placement w/ all unique tiles', () => {
        const outputTiles = placement.map(({ tile }) => tile);
        expect(new Set(outputTiles).size).toBe(outputTiles.length);
      });
      test('returns empty placement when no input tiles are placed', () => {
        const emptyBoard = Board.create(Type.Preset);
        expect(emptyBoard.buildPlacement({ axis, cell: inputCell }, inputTiles)).toEqual([]);
      });
      test('returns empty placement when input tiles are split into segments', () => {
        const splitBoard = Board.create(Type.Preset);
        splitBoard.placeTile(inputCell, inputTileA);
        splitBoard.placeTile((inputCell + step * 3) as Cell, inputTileB);
        expect(splitBoard.buildPlacement({ axis, cell: inputCell }, inputTiles)).toEqual([]);
      });
      test('returns empty placement when only some input tiles are placed', () => {
        const partialBoard = Board.create(Type.Preset);
        partialBoard.placeTile(inputCell, inputTileA);
        expect(partialBoard.buildPlacement({ axis, cell: inputCell }, inputTiles)).toEqual([]);
      });
      test('returns empty placement when input tiles are on opposite axis', () => {
        const otherStep = axis === Axis.X ? LayoutService.CELLS_PER_AXIS : 1;
        const otherAxisBoard = Board.create(Type.Preset);
        otherAxisBoard.placeTile(inputCell, inputTileA);
        otherAxisBoard.placeTile((inputCell + otherStep) as Cell, inputTileB);
        expect(otherAxisBoard.buildPlacement({ axis, cell: inputCell }, inputTiles)).toEqual([]);
      });
      test('excludes unrelated segment before targets', () => {
        const segmentBoard = Board.create(Type.Preset);
        const unrelatedTile = 'X' as GameTile;
        segmentBoard.placeTile((inputCell - step * 3) as Cell, unrelatedTile);
        segmentBoard.placeTile(inputCell, inputTileA);
        segmentBoard.placeTile((inputCell + step) as Cell, inputTileB);
        const newPlacement = segmentBoard.buildPlacement({ axis, cell: inputCell }, inputTiles);
        const tiles = newPlacement.map(({ tile }) => tile);
        expect(tiles).not.toContain(unrelatedTile);
        expect(tiles).toEqual([inputTileA, inputTileB]);
      });
    });
  });
  describe('placeTile', () => {
    const occupiedCell = 0 as Cell;
    const unoccupiedCell = 1 as Cell;
    const placedTile = 'A' as GameTile;
    const unplacedTile = 'B' as GameTile;
    let board: Board;
    beforeEach(() => {
      board = Board.create(Type.Preset);
      board.placeTile(occupiedCell, placedTile);
    });
    test('assigns unplaced tile to unoccupied cell', () => {
      board.placeTile(unoccupiedCell, unplacedTile);
      expect(board.findTileByCell(unoccupiedCell)).toBe(unplacedTile);
    });
    test('does not assign unplaced tile to occupied cell', () => {
      expect(() => {
        board.placeTile(occupiedCell, unplacedTile);
      }).toThrow();
    });
    test('does not assign placed tile to unoccupied cell', () => {
      expect(() => {
        board.placeTile(unoccupiedCell, placedTile);
      }).toThrow();
    });
    test('does not assign placed tile to occupied cell', () => {
      expect(() => {
        board.placeTile(occupiedCell, placedTile);
      }).toThrow();
    });
  });
  describe('undoPlaceTile', () => {
    const occupiedCell = 0 as Cell;
    const placedTile = 'A' as GameTile;
    const unplacedTile = 'B' as GameTile;
    let board: Board;
    beforeEach(() => {
      board = Board.create(Type.Preset);
      board.placeTile(occupiedCell, placedTile);
    });
    test('removes placed tile', () => {
      board.undoPlaceTile(placedTile);
      expect(board.findTileByCell(occupiedCell)).toBeUndefined();
      expect(board.findCellByTile(placedTile)).toBeUndefined();
    });
    test('does not remove unplaced tile', () => {
      expect(() => {
        board.undoPlaceTile(unplacedTile);
      }).toThrow();
    });
    test('allows new placement after placed tile removal', () => {
      board.undoPlaceTile(placedTile);
      board.placeTile(occupiedCell, unplacedTile);
      expect(board.findTileByCell(occupiedCell)).toBe(unplacedTile);
    });
  });
  describe('cells', () => {
    // covered in LayoutService.test.ts
  });
  describe('cellsPerAxis', () => {
    // covered in LayoutService.test.ts
  });
  describe('getAdjacentCells', () => {
    // covered in LayoutService.test.ts
  });
  describe('getAxisCells', () => {
    // covered in LayoutService.test.ts
  });
  describe('getCellPositionInColumn', () => {
    // covered in LayoutService.test.ts
  });
  describe('getCellPositionInRow', () => {
    // covered in LayoutService.test.ts
  });
  describe('getOppositeAxis', () => {
    // covered in LayoutService.test.ts
  });
  describe('isCellCenter', () => {
    // covered in LayoutService.test.ts
  });
  describe('isCellPositionAtAxisEnd', () => {
    // covered in LayoutService.test.ts
  });
  describe('isCellPositionAtAxisStart', () => {
    // covered in LayoutService.test.ts
  });
});
