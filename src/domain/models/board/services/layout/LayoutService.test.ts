import { describe, expect, test } from 'vitest';
import { Axis } from '@/domain/models/board/enums.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { AnchorCoordinates, Cell } from '@/domain/models/board/types.ts';

type CellCases = {
  readonly adjacentCells: ReadonlyArray<Cell>;
  readonly cell: Cell;
  readonly column: number;
  readonly isBottomEdge: boolean;
  readonly isLeftEdge: boolean;
  readonly isRightEdge: boolean;
  readonly isTopEdge: boolean;
  readonly row: number;
};

type CoordsCases = {
  readonly axisCells: ReadonlyArray<Cell>;
  readonly coords: AnchorCoordinates;
};

class CasesFactory {
  static createCellCases(): ReadonlyArray<CellCases> {
    const altGrid = this.buildAltGrid();
    return altGrid.flatMap((altRowCells, row) =>
      altRowCells.map((cell, column) => ({
        adjacentCells: this.computeAltAdjacentCells(altGrid, row, column),
        cell,
        column,
        isBottomEdge: row === altGrid.length - 1,
        isLeftEdge: column === 0,
        isRightEdge: column === altRowCells.length - 1,
        isTopEdge: row === 0,
        row,
      })),
    );
  }

  static createCoordsCases(): ReadonlyArray<CoordsCases> {
    const altGrid = this.buildAltGrid();
    return altGrid.flatMap(altRowCells =>
      altRowCells.flatMap((cell, column) => [
        { axisCells: altRowCells, coords: { axis: Axis.X, cell } },
        { axisCells: altGrid.map(altGridRow => altGridRow[column]!), coords: { axis: Axis.Y, cell } },
      ]),
    );
  }

  private static buildAltGrid(): ReadonlyArray<ReadonlyArray<Cell>> {
    return Array.from({ length: LayoutService.CELLS_PER_AXIS ** 2 }, (_, index) => index as Cell).reduce<Array<Array<Cell>>>(
      (rowsSoFar, cell) => {
        const lastRow = rowsSoFar[rowsSoFar.length - 1];
        if (lastRow !== undefined && lastRow.length < LayoutService.CELLS_PER_AXIS) lastRow.push(cell);
        else rowsSoFar.push([cell]);
        return rowsSoFar;
      },
      [],
    );
  }

  private static computeAltAdjacentCells(
    altGrid: ReadonlyArray<ReadonlyArray<Cell>>,
    row: number,
    column: number,
  ): ReadonlyArray<Cell> {
    return [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]
      .map(([rowOffset, columnOffset]) => altGrid[row + rowOffset!]?.[column + columnOffset!])
      .filter((neighbor): neighbor is Cell => neighbor !== undefined);
  }
}

describe('LayoutService', () => {
  describe.each(CasesFactory.createCellCases())(
    'for cell $cell',
    ({ adjacentCells, cell, column, isBottomEdge, isLeftEdge, isRightEdge, isTopEdge, row }) => {
      test('calculates adjacent cells', () => {
        expect(LayoutService.getAdjacentCells(cell)).toEqual(adjacentCells);
      });

      test('calculates column position', () => {
        expect(LayoutService.getCellPositionInColumn(cell)).toBe(column);
      });

      test('calculates is on bottom edge', () => {
        expect(LayoutService.isCellOnBottomEdge(cell)).toBe(isBottomEdge);
      });

      test('calculates is on left edge', () => {
        expect(LayoutService.isCellOnLeftEdge(cell)).toBe(isLeftEdge);
      });

      test('calculates is on right edge', () => {
        expect(LayoutService.isCellOnRightEdge(cell)).toBe(isRightEdge);
      });

      test('calculates is on top edge', () => {
        expect(LayoutService.isCellOnTopEdge(cell)).toBe(isTopEdge);
      });

      test('calculates row position', () => {
        expect(LayoutService.getCellPositionInRow(cell)).toBe(row);
      });
    },
  );

  describe.each(CasesFactory.createCoordsCases())(
    'for coords (axis $coords.axis, cell $coords.cell)',
    ({ axisCells, coords }) => {
      test('calculates axis cells', () => {
        expect(LayoutService.getAxisCells(coords)).toEqual(axisCells);
      });
    },
  );
});
