import Board, { Axis, Bonus, BonusDistribution } from '@/domain/models/Board.ts';
import areEqual from '$/areEqual.ts';
import { createCellIndex, createTileId } from '$/unit/helpers/casts.ts';

const CELLS_PER_AXIS = 15;
const TOTAL_CELLS = CELLS_PER_AXIS * CELLS_PER_AXIS;
const CENTER_INDEX = Math.floor(TOTAL_CELLS / 2);

describe('Board', () => {
  describe('initial state', () => {
    let board: Board;

    it('should have correct number of cells', () => {
      expect(board.cells).toHaveLength(TOTAL_CELLS);
    });

    it('should place center cell correctly', () => {
      expect(board.isCellCenter(createCellIndex(CENTER_INDEX))).toBe(true);
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('bonus system', () => {
    const CLASSIC_INDICES = {
      withDoubleLetter: createCellIndex(7),
      withDoubleWord: createCellIndex(32),
      withoutBonus: createCellIndex(CENTER_INDEX),
      withTripleLetter: createCellIndex(0),
      withTripleWord: createCellIndex(4),
    };

    let classicBoard: Board;
    let randomBoard: Board;

    it('should have expected counts', () => {
      const EXPECTED_COUNTS = { doubleLetter: 24, doubleWord: 12, tripleLetter: 20, tripleWord: 8 };
      function countBonuses(board: Board) {
        let doubleLetter = 0,
          doubleWord = 0,
          tripleLetter = 0,
          tripleWord = 0;
        for (const cell of board.cells) {
          const bonus = board.getBonus(cell);
          if (bonus === Bonus.DoubleLetter) doubleLetter++;
          else if (bonus === Bonus.TripleLetter) tripleLetter++;
          else if (bonus === Bonus.DoubleWord) doubleWord++;
          else if (bonus === Bonus.TripleWord) tripleWord++;
        }
        return { doubleLetter, doubleWord, tripleLetter, tripleWord };
      }
      expect(countBonuses(classicBoard)).toEqual(EXPECTED_COUNTS);
      expect(countBonuses(randomBoard)).toEqual(EXPECTED_COUNTS);
    });

    it('should exclude the center cell', () => {
      expect(classicBoard.getBonus(createCellIndex(CENTER_INDEX))).toBeNull();
      expect(randomBoard.getBonus(createCellIndex(CENTER_INDEX))).toBeNull();
    });

    it('should return correct type for Classic', () => {
      expect(classicBoard.getBonus(CLASSIC_INDICES.withDoubleLetter)).toBe(Bonus.DoubleLetter);
      expect(classicBoard.getBonus(CLASSIC_INDICES.withTripleLetter)).toBe(Bonus.TripleLetter);
      expect(classicBoard.getBonus(CLASSIC_INDICES.withDoubleWord)).toBe(Bonus.DoubleWord);
      expect(classicBoard.getBonus(CLASSIC_INDICES.withTripleWord)).toBe(Bonus.TripleWord);
    });

    it('should return correct letter multipliers for Classic', () => {
      expect(classicBoard.getMultiplierForLetter(CLASSIC_INDICES.withDoubleLetter)).toBe(2);
      expect(classicBoard.getMultiplierForLetter(CLASSIC_INDICES.withTripleLetter)).toBe(3);
      expect(classicBoard.getMultiplierForLetter(CLASSIC_INDICES.withoutBonus)).toBe(1);
    });

    it('should return correct word multipliers for Classic', () => {
      expect(classicBoard.getMultiplierForWord(CLASSIC_INDICES.withDoubleWord)).toBe(2);
      expect(classicBoard.getMultiplierForWord(CLASSIC_INDICES.withTripleWord)).toBe(3);
      expect(classicBoard.getMultiplierForWord(CLASSIC_INDICES.withoutBonus)).toBe(1);
    });

    it('should change the distribution from Classic to Random', () => {
      const board = Board.create(BonusDistribution.Classic);
      expect(board.bonusDistribution).toBe(BonusDistribution.Classic);
      board.changeBonusDistribution(BonusDistribution.Random);
      expect(board.bonusDistribution).toBe(BonusDistribution.Random);
    });

    it('should change the distribution from Random To Classic', () => {
      const board = Board.create(BonusDistribution.Random);
      expect(board.bonusDistribution).toBe(BonusDistribution.Random);
      board.changeBonusDistribution(BonusDistribution.Classic);
      expect(board.bonusDistribution).toBe(BonusDistribution.Classic);
    });

    beforeEach(() => {
      classicBoard = Board.create(BonusDistribution.Classic);
      randomBoard = Board.create(BonusDistribution.Random);
    });
  });

  describe('how placement resolves', () => {
    const firstCellIndex = createCellIndex(CENTER_INDEX);
    const secondCellIndex = createCellIndex(CENTER_INDEX + 1);
    const firstTileId = createTileId('A-0');
    const secondTileId = createTileId('B-0');

    let board: Board;

    it('should return correct number of links', () => {
      board.placeTile(firstCellIndex, firstTileId);
      board.placeTile(secondCellIndex, secondTileId);
      const result = board.resolvePlacement([firstTileId, secondTileId]);
      expect(result).toHaveLength(2);
    });

    it('should return correct links', () => {
      board.placeTile(firstCellIndex, firstTileId);
      board.placeTile(secondCellIndex, secondTileId);
      const result = board.resolvePlacement([firstTileId, secondTileId]);
      expect(result[0]!.cell).toBe(firstCellIndex);
      expect(result[1]!.cell).toBe(secondCellIndex);
    });

    it('should return links sorted correctly', () => {
      board.placeTile(firstCellIndex, firstTileId);
      board.placeTile(secondCellIndex, secondTileId);
      const result = board.resolvePlacement([secondTileId, firstTileId]);
      expect(result[0]!.cell).toBe(firstCellIndex);
      expect(result[1]!.cell).toBe(secondCellIndex);
    });

    it('should forbid receiving unplaced tile', () => {
      expect(() => board.resolvePlacement([firstTileId])).toThrow();
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('how indexes and positions are calculated', () => {
    const INDICES = {
      center: createCellIndex(CENTER_INDEX),
      col0Row0: createCellIndex(0),
      col0Row1: createCellIndex(CELLS_PER_AXIS),
      col14Row0: createCellIndex(CELLS_PER_AXIS - 1),
      col14Row14: createCellIndex(TOTAL_CELLS - 1),
    };

    let board: Board;

    it('should return row indices correctly', () => {
      expect(board.getIndexInRow(INDICES.center)).toBe(7);
      expect(board.getIndexInRow(INDICES.col0Row0)).toBe(0);
      expect(board.getIndexInRow(INDICES.col0Row1)).toBe(1);
      expect(board.getIndexInRow(INDICES.col14Row0)).toBe(0);
      expect(board.getIndexInRow(INDICES.col14Row14)).toBe(CELLS_PER_AXIS - 1);
    });

    it('should return column indices correctly', () => {
      expect(board.getIndexInColumn(INDICES.center)).toBe(7);
      expect(board.getIndexInColumn(INDICES.col0Row0)).toBe(0);
      expect(board.getIndexInColumn(INDICES.col0Row1)).toBe(0);
      expect(board.getIndexInColumn(INDICES.col14Row0)).toBe(CELLS_PER_AXIS - 1);
      expect(board.getIndexInColumn(INDICES.col14Row14)).toBe(CELLS_PER_AXIS - 1);
    });

    it('should return center correctly', () => {
      expect(board.isCellCenter(INDICES.center)).toBe(true);
      expect(board.isCellCenter(INDICES.col0Row0)).toBe(false);
      expect(board.isCellCenter(INDICES.col0Row1)).toBe(false);
      expect(board.isCellCenter(INDICES.col14Row14)).toBe(false);
      expect(board.isCellCenter(INDICES.col14Row0)).toBe(false);
    });

    it('should return correct values for left edge', () => {
      expect(board.isCellPositionOnLeftEdge(0)).toBe(true);
      expect(board.isCellPositionOnLeftEdge(7)).toBe(false);
      expect(board.isCellPositionOnLeftEdge(14)).toBe(false);
    });

    it('should return correct values for right edge', () => {
      expect(board.isCellPositionOnRightEdge(0)).toBe(false);
      expect(board.isCellPositionOnRightEdge(7)).toBe(false);
      expect(board.isCellPositionOnRightEdge(14)).toBe(true);
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('how adjacent cells are calculated', () => {
    let board: Board;

    it('should return correct values for not edge & not corner', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const cells = board.getAdjacentCells(cellIndex);
      expect(cells).toHaveLength(4);
      expect(cells).toContain(createCellIndex(index - 1));
      expect(cells).toContain(createCellIndex(index + 1));
      expect(cells).toContain(createCellIndex(index - CELLS_PER_AXIS));
      expect(cells).toContain(createCellIndex(index + CELLS_PER_AXIS));
    });

    it('should return correct values for edge & not corner', () => {
      const index = 1;
      const cellIndex = createCellIndex(index);
      const cells = board.getAdjacentCells(cellIndex);
      expect(cells).toHaveLength(3);
      expect(cells).toContain(createCellIndex(index - 1));
      expect(cells).toContain(createCellIndex(index + 1));
      expect(cells).toContain(createCellIndex(index + CELLS_PER_AXIS));
    });

    it('should return correct values for edge & corner', () => {
      const index = 0;
      const cellIndex = createCellIndex(index);
      const cells = board.getAdjacentCells(cellIndex);
      expect(cells).toHaveLength(2);
      expect(cells).toContain(createCellIndex(index + 1));
      expect(cells).toContain(createCellIndex(index + CELLS_PER_AXIS));
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('how axis is calculated', () => {
    let board: Board;

    it('should return correct axis for empty array', () => {
      expect(board.calculateAxis([])).toBe(Axis.X);
    });

    it('should return correct axis for cell with no adjacent occupied cells', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      expect(board.calculateAxis([cellIndex])).toBe(Axis.X);
    });

    it('should return correct axis for cell with vertically adjacent occupied cell', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const adjacentCellIndex = createCellIndex(index - CELLS_PER_AXIS);
      const tileId = createTileId('A-0');
      board.placeTile(adjacentCellIndex, tileId);
      expect(board.calculateAxis([cellIndex])).toBe(Axis.Y);
    });

    it('should return correct axis for cell with horizontally adjacent occupied cell', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const adjacentCellIndex = createCellIndex(index - 1);
      const tileId = createTileId('A-0');
      board.placeTile(adjacentCellIndex, tileId);
      expect(board.calculateAxis([cellIndex])).toBe(Axis.X);
    });

    it('should return correct axis for multiple cells in the same row', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const adjacentCellIndex = createCellIndex(index + 1);
      expect(board.calculateAxis([cellIndex, adjacentCellIndex])).toBe(Axis.X);
    });

    it('should return correct axis for multiple cells in the same column', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const adjacentCellIndex = createCellIndex(index + CELLS_PER_AXIS);
      expect(board.calculateAxis([cellIndex, adjacentCellIndex])).toBe(Axis.Y);
    });

    it('should return opposite axis correctly', () => {
      expect(board.getOppositeAxis(Axis.X)).toBe(Axis.Y);
      expect(board.getOppositeAxis(Axis.Y)).toBe(Axis.X);
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('how axis cells are calculated', () => {
    let board: Board;

    it('should return correct amount of cells', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const axisCellsForX = board.getAxisCells({ axis: Axis.X, cell: cellIndex });
      const axisCellsForY = board.getAxisCells({ axis: Axis.Y, cell: cellIndex });
      expect(axisCellsForX).toHaveLength(CELLS_PER_AXIS);
      expect(axisCellsForY).toHaveLength(CELLS_PER_AXIS);
    });

    it('should return correct values for X axis', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const axisCells = board.getAxisCells({ axis: Axis.X, cell: cellIndex });
      const firstIndexInRow = 7 * CELLS_PER_AXIS; // Center is row 7: first cell = 7 * 15 = 105, last = 105 + 14 = 119
      expect(axisCells.at(0)).toBe(createCellIndex(firstIndexInRow));
      expect(axisCells.at(-1)).toBe(createCellIndex(firstIndexInRow + CELLS_PER_AXIS - 1));
    });

    it('should return correct values for Y axis', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const axisCells = board.getAxisCells({ axis: Axis.Y, cell: cellIndex });
      const firstIndexInCol = 7; // Column 7: cells 7, 22, 37, ..., 217 (col index + row * 15)
      expect(axisCells.at(0)).toBe(createCellIndex(firstIndexInCol));
      expect(axisCells.at(-1)).toBe(createCellIndex(firstIndexInCol + (CELLS_PER_AXIS - 1) * CELLS_PER_AXIS));
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('how anchor cells are calculated', () => {
    let board: Board;

    it('should return only center on initial state', () => {
      const cells = board.getAnchorCells(false);
      const centerCellIndex = createCellIndex(CENTER_INDEX);
      expect(cells.size).toBe(1);
      expect(cells.has(centerCellIndex)).toBe(true);
    });

    it('should return cells adjacent to occupied cells after placed tile', () => {
      const index = CENTER_INDEX;
      const cellIndex = createCellIndex(index);
      const tileId = createTileId('A-0');
      board.placeTile(cellIndex, tileId);
      const cells = board.getAnchorCells(true);
      expect(cells.has(createCellIndex(index - 1))).toBe(true);
      expect(cells.has(createCellIndex(index + 1))).toBe(true);
      expect(cells.has(createCellIndex(index - CELLS_PER_AXIS))).toBe(true);
      expect(cells.has(createCellIndex(index + CELLS_PER_AXIS))).toBe(true);
    });

    it('should not return occupied cells', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const tileId = createTileId('A-0');
      board.placeTile(cellIndex, tileId);
      const cells = board.getAnchorCells(true);
      expect(cells.has(cellIndex)).toBe(false);
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('tile placement and lookup', () => {
    let board: Board;

    it('should return correct positive search result', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const tileId = createTileId('A-0');
      board.placeTile(cellIndex, tileId);
      expect(board.isCellOccupied(cellIndex)).toBe(true);
      expect(board.isTilePlaced(tileId)).toBe(true);
      expect(board.findTileByCell(cellIndex)).toBe(tileId);
      expect(board.findCellByTile(tileId)).toBe(cellIndex);
    });

    it('should return correct negative search result', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const tileId = createTileId('A-0');
      expect(board.isCellOccupied(cellIndex)).toBe(false);
      expect(board.isTilePlaced(tileId)).toBe(false);
      expect(board.findTileByCell(cellIndex)).toBeUndefined();
      expect(board.findCellByTile(tileId)).toBeUndefined();
    });

    it('should remove a tile when undoing its placement', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const tileId = createTileId('A-0');
      board.placeTile(cellIndex, tileId);
      board.undoPlaceTile(tileId);
      expect(board.findTileByCell(cellIndex)).toBeUndefined();
      expect(board.isCellOccupied(cellIndex)).toBe(false);
    });

    it('should allow a cell to be reused after undoing a placement', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const firstTileId = createTileId('A-0');
      const secondTileId = createTileId('B-0');
      board.placeTile(cellIndex, firstTileId);
      board.undoPlaceTile(firstTileId);
      board.placeTile(cellIndex, secondTileId);
      expect(board.findTileByCell(cellIndex)).toBe(secondTileId);
    });

    it('should forbid placing tile on occupied cell', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const firstTileId = createTileId('A-0');
      const secondTileId = createTileId('B-0');
      board.placeTile(cellIndex, firstTileId);
      expect(() => board.placeTile(cellIndex, secondTileId)).toThrow();
    });

    it('should forbid placing already placed tile', () => {
      const firstCellIndex = createCellIndex(CENTER_INDEX);
      const secondCellIndex = createCellIndex(CENTER_INDEX + 1);
      const tileId = createTileId('A-0');
      board.placeTile(firstCellIndex, tileId);
      expect(() => board.placeTile(secondCellIndex, tileId)).toThrow();
    });

    it('should forbid placing tile on negative out-of-bounds cell', () => {
      const cellIndex = createCellIndex(-1);
      const tileId = createTileId('A-0');
      expect(() => board.placeTile(cellIndex, tileId)).toThrow();
    });

    it('should forbid placing tile on positive out-of-bounds cell', () => {
      const cellIndex = createCellIndex(TOTAL_CELLS);
      const tileId = createTileId('A-0');
      expect(() => board.placeTile(cellIndex, tileId)).toThrow();
    });

    it('should forbid undoing placement of a tile not on the board', () => {
      const tileId = createTileId('A-0');
      expect(() => board.undoPlaceTile(tileId)).toThrow();
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });

  describe('snapshot', () => {
    let board: Board;

    it('should capture and restore tileByCell', () => {
      const cellIndex = createCellIndex(CENTER_INDEX);
      const tileId = createTileId('A-0');
      board.placeTile(cellIndex, tileId);
      const { tileByCell } = board.snapshot;
      const restoredBoard = Board.restoreFromSnapshot(board.snapshot);
      expect(areEqual(restoredBoard.snapshot.tileByCell, tileByCell)).toBe(true);
    });

    it('should capture and restore layout', () => {
      const { layout } = board.snapshot;
      const restoredBoard = Board.restoreFromSnapshot(board.snapshot);
      expect(areEqual(restoredBoard.snapshot.layout, layout)).toBe(true);
    });

    beforeEach(() => {
      board = Board.create(BonusDistribution.Classic);
    });
  });
});
