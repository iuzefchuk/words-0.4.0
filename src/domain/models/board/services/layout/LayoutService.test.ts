import Board from '@/domain/models/board/Board.ts';
import { Axis } from '@/domain/models/board/enums.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';
import { Cell } from '@/domain/models/board/types.ts';

const cellsPerAxis = Board.CELLS_PER_AXIS;
// 2D grid used as an alternative to flat-index arithmetic for deriving expected values
const grid = Array.from({ length: cellsPerAxis }, (_, row) =>
  Array.from({ length: cellsPerAxis }, (_, col) => (row * cellsPerAxis + col) as Cell),
);
const cells = Board.CELLS_BY_INDEX.map(cell => [cell] as const);
const positions = Array.from({ length: cellsPerAxis }, (_, i) => [i] as const);
const findCellPosition = (cell: Cell): [number, number] => [Math.floor(cell / cellsPerAxis), cell % cellsPerAxis];

describe('LayoutService', () => {
  it.each(cells)('calculates adjacent cells correctly for cell %i', cell => {
    const directionOffsets: ReadonlyArray<readonly [number, number]> = [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ];
    const [row, col] = findCellPosition(cell);
    const adjacentCoords = directionOffsets.map(([rowDelta, colDelta]) => [row + rowDelta, col + colDelta] as const);
    const inBoundsCoords = adjacentCoords.filter(
      ([neighborRow, neighborCol]) =>
        neighborRow >= 0 && neighborRow < cellsPerAxis && neighborCol >= 0 && neighborCol < cellsPerAxis,
    );
    const expectedAdjacentCells = inBoundsCoords.map(([neighborRow, neighborCol]) => grid[neighborRow]![neighborCol]!);
    expect(LayoutService.calculateAdjacentCells(cell)).toEqual(expectedAdjacentCells);
  });

  it.each(cells)('calculates axis cells correctly for cell %i', cell => {
    const [row, col] = findCellPosition(cell);
    const expectedRowCells = grid[row]!;
    expect(LayoutService.calculateAxisCells({ axis: Axis.X, cell })).toEqual(expectedRowCells);
    const expectedColumnCells = grid.map(gridRow => gridRow[col]!);
    expect(LayoutService.calculateAxisCells({ axis: Axis.Y, cell })).toEqual(expectedColumnCells);
  });

  it.each(cells)('calculates row position correctly for cell %i', cell => {
    const [expectedRow] = findCellPosition(cell);
    expect(LayoutService.getCellPositionInRow(cell)).toBe(expectedRow);
  });

  it.each(cells)('calculates column position correctly for cell %i', cell => {
    const [, expectedCol] = findCellPosition(cell);
    expect(LayoutService.getCellPositionInColumn(cell)).toBe(expectedCol);
  });

  it.each(positions)('calculates axis start correctly for position %i', position => {
    const [firstPosition] = grid.keys();
    expect(LayoutService.isCellPositionAtAxisStart(position)).toBe(position === firstPosition);
  });

  it.each(positions)('calculates axis end correctly for position %i', position => {
    const lastPosition = Array.from(grid.keys()).at(-1)!;
    expect(LayoutService.isCellPositionAtAxisEnd(position)).toBe(position === lastPosition);
  });

  it.each(cells)('calculates bottom edge correctly for cell %i', cell => {
    const bottomRowCells = new Set(grid.at(-1)!);
    expect(LayoutService.isCellOnBottomEdge(cell)).toBe(bottomRowCells.has(cell));
  });

  it.each(cells)('calculates left edge correctly for cell %i', cell => {
    const leftColumnCells = new Set(grid.map(gridRow => gridRow.at(0)!));
    expect(LayoutService.isCellOnLeftEdge(cell)).toBe(leftColumnCells.has(cell));
  });

  it.each(cells)('calculates right edge correctly for cell %i', cell => {
    const rightColumnCells = new Set(grid.map(gridRow => gridRow.at(-1)!));
    expect(LayoutService.isCellOnRightEdge(cell)).toBe(rightColumnCells.has(cell));
  });

  it.each(cells)('calculates top edge correctly for cell %i', cell => {
    const topRowCells = new Set(grid.at(0)!);
    expect(LayoutService.isCellOnTopEdge(cell)).toBe(topRowCells.has(cell));
  });

  it.each([[-1], [Board.TOTAL_CELLS]])('throws on out-of-bounds cell %i', invalidCell => {
    expect(() => LayoutService.calculateAdjacentCells(invalidCell as Cell)).toThrow(RangeError);
    expect(() => LayoutService.calculateAxisCells({ axis: Axis.X, cell: invalidCell as Cell })).toThrow(RangeError);
    expect(() => LayoutService.getCellPositionInRow(invalidCell as Cell)).toThrow(RangeError);
    expect(() => LayoutService.getCellPositionInColumn(invalidCell as Cell)).toThrow(RangeError);
    expect(() => LayoutService.isCellOnBottomEdge(invalidCell as Cell)).toThrow(RangeError);
    expect(() => LayoutService.isCellOnLeftEdge(invalidCell as Cell)).toThrow(RangeError);
    expect(() => LayoutService.isCellOnRightEdge(invalidCell as Cell)).toThrow(RangeError);
    expect(() => LayoutService.isCellOnTopEdge(invalidCell as Cell)).toThrow(RangeError);
  });

  it.each([[-1], [cellsPerAxis]])('throws on out-of-bounds position %i', invalidPosition => {
    expect(() => LayoutService.isCellPositionAtAxisStart(invalidPosition)).toThrow(RangeError);
    expect(() => LayoutService.isCellPositionAtAxisEnd(invalidPosition)).toThrow(RangeError);
  });
});
