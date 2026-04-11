import Board from '@/domain/models/board/Board.ts';
import { Axis } from '@/domain/models/board/enums.ts';
import LayoutService from '@/domain/models/board/services/layout/LayoutService.ts';

describe('LayoutService', () => {
  const STEP_X = LayoutService.getAxisStep(Axis.X);
  const STEP_Y = LayoutService.getAxisStep(Axis.Y);

  it('calculates adjacent cells correctly', () => {
    const CELLS_PER_AXIS = LayoutService.CELLS_PER_AXIS;
    Board.CELLS_BY_INDEX.forEach(cell => {
      const row = Math.floor(cell / CELLS_PER_AXIS);
      const col = cell % CELLS_PER_AXIS;
      const expected = new Set<number>();
      if (row > 0) expected.add(cell - CELLS_PER_AXIS);
      if (row < CELLS_PER_AXIS - 1) expected.add(cell + CELLS_PER_AXIS);
      if (col > 0) expected.add(cell - 1);
      if (col < CELLS_PER_AXIS - 1) expected.add(cell + 1);
      const adjacents = LayoutService.calculateAdjacentCells(cell);
      expect(new Set(adjacents)).toEqual(expected);
      expect(adjacents).toHaveLength(expected.size);
    });
  });

  it('calculates axis cells correctly', () => {
    Board.CELLS_BY_INDEX.forEach(cell => {
      const axisCellsForX = LayoutService.calculateAxisCells({ axis: Axis.X, cell });
      const axisCellsForY = LayoutService.calculateAxisCells({ axis: Axis.Y, cell });
      expect(axisCellsForX).toHaveLength(LayoutService.CELLS_PER_AXIS);
      expect(axisCellsForY).toHaveLength(LayoutService.CELLS_PER_AXIS);
      expect(axisCellsForX).toBeRisingWithStep(STEP_X);
      expect(axisCellsForY).toBeRisingWithStep(STEP_Y);
    });
  });

  it('returns row position correctly', () => {
    // TODO getCellPositionInRow
  });

  it('returns column position correctly', () => {
    // TODO getCellPositionInColumn
  });

  it('returns axis start correctly', () => {
    // TODO isCellPositionAtAxisStart
  });

  it('returns axis end correctly', () => {
    // TODO isCellPositionAtAxisEnd
  });

  it('calculates bottom edge correctly', () => {
    // TODO isCellOnBottomEdge
  });

  it('calculates left edge correctly', () => {
    // TODO isCellOnLeftEdge
  });

  it('calculates right edge correctly', () => {
    // TODO isCellOnRightEdge
  });

  it('calculates top edge correctly', () => {
    // TODO isCellOnTopEdge
  });
});
