import Board from '@/domain/models/board/Board.ts';
import { Type } from '@/domain/models/board/enums.ts';
import { Cell } from '@/domain/models/board/types.ts';
import { GameTile } from '@/domain/types/index.ts';
import shuffleWithFisherYates from '@/shared/shuffleWithFisherYates.ts';

type BoardFixture = {
  desc: string;
  instance: Board;
  meta: {
    placements: ReadonlyArray<{ cell: Cell; tile: GameTile }>;
    unusedCells: ReadonlyArray<Cell>;
    unusedTiles: ReadonlyArray<GameTile>;
  };
};

const cells = [...Board.create(Type.Preset).cells];
const tiles = cells.map((_, idx) => `tile-${String(idx)}` as GameTile);
const shuffledCells = shuffleWithFisherYates({ array: [...cells], randomizerFunction: () => 0.5 });

const fixtures: ReadonlyArray<BoardFixture> = [0, 1, 2, 3, 4, 5, 10, 25, 50, tiles.length].map(placementCount => {
  const instance = Board.create(Type.Preset);
  const placements: Array<{ cell: Cell; tile: GameTile }> = [];
  for (let idx = 0; idx < placementCount; idx++) {
    const cell = shuffledCells[idx];
    if (cell === undefined) throw new ReferenceError(`expected cell at index ${String(idx)}, got undefined`);
    const tile = tiles[idx];
    if (tile === undefined) throw new ReferenceError(`expected tile at index ${String(idx)}, got undefined`);
    instance.placeTile(cell, tile);
    placements.push({ cell, tile });
  }
  return {
    desc: `w/ ${String(placementCount)} placements`,
    instance,
    meta: {
      placements,
      unusedCells: cells.filter(cell => !instance.isCellOccupied(cell)),
      unusedTiles: tiles.filter(tile => !instance.isTilePlaced(tile)),
    },
  };
});

export default fixtures;
