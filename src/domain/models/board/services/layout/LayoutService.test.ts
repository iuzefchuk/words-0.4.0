import { describe, expect, test } from 'vitest';
import { Axis } from '@/domain/models/board/enums.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { Cell } from '@/domain/models/board/types.ts';

class IndexMatrix {
  get entries(): ReadonlyArray<{ cell: number; column: number; row: number }> {
    return this.grid.flatMap((rowCells, row) => rowCells.map((cell, column) => ({ cell, column, row })));
  }

  private get grid(): ReadonlyArray<ReadonlyArray<number>> {
    return Array.from({ length: this.size }, (_, row) =>
      Array.from({ length: this.size }, (_, column) => row * this.size + column),
    );
  }

  constructor(public readonly size: number) {}

  getCollinearIndices(axis: Axis, row: number, column: number): ReadonlyArray<number> {
    switch (axis) {
      case Axis.X: {
        const rowCells = this.grid[row];
        if (rowCells === undefined) throw new ReferenceError(`expected row at index ${String(row)}, got undefined`);
        return rowCells;
      }
      case Axis.Y: {
        return this.grid.map(otherRow => {
          const columnCell = otherRow[column];
          if (columnCell === undefined) throw new ReferenceError(`expected cell at column ${String(column)}, got undefined`);
          return columnCell;
        });
      }
      default:
        throw new ReferenceError(`expected axis to be one of ${Object.values(Axis).join(', ')}, got ${String(axis)}`);
    }
  }

  getOrthogonalNeighbors(row: number, column: number): ReadonlyArray<number> {
    const offsets: ReadonlyArray<readonly [number, number]> = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    return offsets
      .map(([rowOffset, columnOffset]) => this.grid[row + rowOffset]?.[column + columnOffset])
      .filter((value): value is number => value !== undefined);
  }
}

describe('LayoutService', () => {
  const matrix = new IndexMatrix(LayoutService.CELLS_PER_AXIS);
  describe('CELLS_PER_AXIS', () => {
    test('is greater than 0', () => {
      expect(LayoutService.CELLS_PER_AXIS).toBeGreaterThan(0);
    });
    test('is odd', () => {
      expect(LayoutService.CELLS_PER_AXIS % 2).not.toBe(0);
    });
  });
  describe('CELLS', () => {
    test('contains all cell indices in row-major order', () => {
      expect(LayoutService.CELLS).toEqual(matrix.entries.map(entry => entry.cell));
    });
  });
  describe('CENTER_CELL', () => {
    test('is in middle of CELLS', () => {
      expect(LayoutService.CENTER_CELL).toBe(Math.floor(LayoutService.CELLS.length / 2));
    });
  });
  describe.each(matrix.entries)('for $cell', ({ cell, column, row }) => {
    describe('getAdjacentCells', () => {
      test('returns orthogonal neighbors', () => {
        const actual = LayoutService.getAdjacentCells(cell as Cell);
        const expected = matrix.getOrthogonalNeighbors(row, column);
        expect(actual).toEqual(expected);
      });
    });
    describe.each(Object.values(Axis))('for %s', axis => {
      describe('getAxisCells', () => {
        test('returns cells on input axis', () => {
          const actual = LayoutService.getAxisCells({ axis, cell: cell as Cell });
          const expected = matrix.getCollinearIndices(axis, row, column);
          expect(actual).toEqual(expected);
        });
      });
    });
    describe('getCellPositionInColumn', () => {
      test('returns column index', () => {
        expect(LayoutService.getCellPositionInColumn(cell as Cell)).toEqual(column);
      });
    });
    describe('getCellPositionInRow', () => {
      test('returns row index', () => {
        expect(LayoutService.getCellPositionInRow(cell as Cell)).toEqual(row);
      });
    });
    describe('isCellOnBottomEdge', () => {
      test('returns true if cell row is last row', () => {
        expect(LayoutService.isCellOnBottomEdge(cell as Cell)).toEqual(row === matrix.size - 1);
      });
    });
    describe('isCellOnLeftEdge', () => {
      test('returns true if cell column is first column', () => {
        expect(LayoutService.isCellOnLeftEdge(cell as Cell)).toEqual(column === 0);
      });
    });
    describe('isCellOnRightEdge', () => {
      test('returns true if cell column is last column', () => {
        expect(LayoutService.isCellOnRightEdge(cell as Cell)).toEqual(column === matrix.size - 1);
      });
    });
    describe('isCellOnTopEdge', () => {
      test('returns true if cell row is first row', () => {
        expect(LayoutService.isCellOnTopEdge(cell as Cell)).toEqual(row === 0);
      });
    });
  });
  describe('getOppositeAxis', () => {
    test('returns Y for X', () => {
      expect(LayoutService.getOppositeAxis(Axis.X)).toBe(Axis.Y);
    });
    test('returns X for Y', () => {
      expect(LayoutService.getOppositeAxis(Axis.Y)).toBe(Axis.X);
    });
  });
  describe('DEFAULT_AXIS', () => {
    test('is one of Axis values', () => {
      expect(Object.values(Axis)).toContain(LayoutService.DEFAULT_AXIS);
    });
  });
  describe('isCellCenter', () => {
    test('returns true for CENTER_CELL', () => {
      expect(LayoutService.isCellCenter(LayoutService.CENTER_CELL)).toBe(true);
    });
    test('returns false for non-center cell', () => {
      const nonCenterCell = LayoutService.CELLS.find(cell => cell !== LayoutService.CENTER_CELL);
      if (nonCenterCell === undefined) throw new ReferenceError('expected non-center cell, got undefined');
      expect(LayoutService.isCellCenter(nonCenterCell)).toBe(false);
    });
  });
  describe('isCellPositionAtAxisEnd', () => {
    test('returns true for last position', () => {
      expect(LayoutService.isCellPositionAtAxisEnd(LayoutService.CELLS_PER_AXIS - 1)).toBe(true);
    });
    test('returns false for first position', () => {
      expect(LayoutService.isCellPositionAtAxisEnd(0)).toBe(false);
    });
    test('returns false for middle position', () => {
      expect(LayoutService.isCellPositionAtAxisEnd(Math.floor(LayoutService.CELLS_PER_AXIS / 2))).toBe(false);
    });
  });
  describe('isCellPositionAtAxisStart', () => {
    test('returns true for first position', () => {
      expect(LayoutService.isCellPositionAtAxisStart(0)).toBe(true);
    });
    test('returns false for last position', () => {
      expect(LayoutService.isCellPositionAtAxisStart(LayoutService.CELLS_PER_AXIS - 1)).toBe(false);
    });
    test('returns false for middle position', () => {
      expect(LayoutService.isCellPositionAtAxisStart(Math.floor(LayoutService.CELLS_PER_AXIS / 2))).toBe(false);
    });
  });
});
