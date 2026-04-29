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

  getAxisCells(axis: Axis, row: number, column: number): ReadonlyArray<number> {
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
  });
  describe('DEFAULT_AXIS', () => {
    test('is an axis', () => {
      expect(LayoutService.DEFAULT_AXIS).toBeOneOf(Object.values(Axis));
    });
  });
  describe.each(matrix.entries)('for $cell', ({ cell, column, row }) => {
    test('getAdjacentCells returns returns geometrically expected value', () => {
      const actual = LayoutService.getAdjacentCells(cell as Cell);
      const expected = matrix.getOrthogonalNeighbors(row, column);
      expect(actual).toEqual(expected);
    });
    test('getCellPositionInColumn returns geometrically expected value', () => {
      expect(LayoutService.getCellPositionInColumn(cell as Cell)).toEqual(column);
    });
    test('getCellPositionInRow returns geometrically expected value', () => {
      expect(LayoutService.getCellPositionInRow(cell as Cell)).toEqual(row);
    });
    test('isCellOnBottomEdge returns geometrically expected value', () => {
      expect(LayoutService.isCellOnBottomEdge(cell as Cell)).toEqual(row === matrix.size - 1);
    });
    test('isCellOnLeftEdge returns geometrically expected value', () => {
      expect(LayoutService.isCellOnLeftEdge(cell as Cell)).toEqual(column === 0);
    });
    test('isCellOnRightEdge returns geometrically expected value', () => {
      expect(LayoutService.isCellOnRightEdge(cell as Cell)).toEqual(column === matrix.size - 1);
    });
    test('isCellOnTopEdge returns geometrically expected value', () => {
      expect(LayoutService.isCellOnTopEdge(cell as Cell)).toEqual(row === 0);
    });
    describe.each(Object.values(Axis))('for $axis', axis => {
      test('getAxisCells returns geometrically expected value', () => {
        const actual = LayoutService.getAxisCells({ axis, cell: cell as Cell });
        const expected = matrix.getAxisCells(axis, row, column);
        expect(actual).toEqual(expected);
      });
    });
  });
  describe('getOppositeAxis', () => {
    describe.each(Object.values(Axis))('for $axis', axis => {
      test('returns axis', () => {
        expect(LayoutService.getOppositeAxis(axis)).toBeOneOf(Object.values(Axis));
      });
      test('returns axis that is different', () => {
        expect(LayoutService.getOppositeAxis(axis)).not.toBe(axis);
      });
    });
  });
});
