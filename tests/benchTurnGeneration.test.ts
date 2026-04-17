import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { describe, it } from 'vitest';
import { Player } from '@/domain/enums.ts';
import Board from '@/domain/models/board/Board.ts';
import { BoardType } from '@/domain/models/board/enums.ts';
import { Cell } from '@/domain/models/board/types.ts';
import Dictionary from '@/domain/models/dictionary/Dictionary.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import TurnGenerationService from '@/domain/services/generation/turn/TurnGenerationService.ts';

const LETTER_COUNTS: Record<string, number> = {
  A: 9,
  B: 2,
  C: 2,
  D: 4,
  E: 12,
  F: 2,
  G: 3,
  H: 2,
  I: 9,
  J: 1,
  K: 1,
  L: 4,
  M: 2,
  N: 6,
  O: 8,
  P: 2,
  Q: 1,
  R: 6,
  S: 4,
  T: 6,
  U: 4,
  V: 2,
  W: 2,
  X: 1,
  Y: 2,
  Z: 1,
};

const WORDS: Array<{ cell: number; letters: string; vertical?: boolean }> = [
  { cell: 17, letters: 'RATE' }, // row 1 col 2
  { cell: 51, letters: 'NOTE' }, // row 3 col 6
  { cell: 77, letters: 'GAIN' }, // row 5 col 2
  { cell: 111, letters: 'LADE' }, // row 7 col 6
  { cell: 137, letters: 'ONES' }, // row 9 col 2
  { cell: 171, letters: 'TIDE' }, // row 11 col 6
  { cell: 197, letters: 'LINE' }, // row 13 col 2
  { cell: 0, letters: 'AIRS', vertical: true }, // col 0
  { cell: 42, letters: 'NEAR', vertical: true }, // col 12
  { cell: 134, letters: 'TORE', vertical: true }, // col 14
];

function buildBoard(inventory: Inventory): Board {
  const board = Board.create(BoardType.Classic);
  const rackTiles = new Set<string>([...inventory.getTilesFor(Player.User), ...inventory.getTilesFor(Player.Opponent)]);
  const placed = new Set<string>();
  const pick = (letter: string): string => {
    const max = LETTER_COUNTS[letter] ?? 0;
    for (let i = 0; i < max; i++) {
      const tile = `${letter}-${i}`;
      if (!rackTiles.has(tile) && !placed.has(tile)) {
        placed.add(tile);
        return tile;
      }
    }
    throw new Error(`No free tile for ${letter}`);
  };
  for (const { cell, letters, vertical } of WORDS) {
    const step = vertical ? 15 : 1;
    for (let i = 0; i < letters.length; i++) {
      const pos = cell + i * step;
      if (!board.isCellOccupied(pos as Cell)) {
        board.placeTile(pos as Cell, pick(letters[i]!) as Tile);
      }
    }
  }
  return board;
}

function loadDictionary(): Dictionary {
  const raw = readFileSync('public/dictionary.bin');
  const buf = new ArrayBuffer(raw.byteLength);
  new Uint8Array(buf).set(new Uint8Array(raw.buffer, raw.byteOffset, raw.byteLength));
  return Dictionary.createFromBuffer(buf);
}

describe.skipIf(!process.env.BENCH)('TurnGeneration bench', () => {
  it('mid-game full run', () => {
    const dictionary = loadDictionary();
    let inventory: Inventory | null = null;
    let board: Board | null = null;
    let seed = 1;
    while (!board) {
      const s = seed++;
      let state = s * 2654435761;
      const rand = (): number => {
        state = (state ^ (state >>> 16)) >>> 0;
        state = Math.imul(state, 0x7feb352d) >>> 0;
        state = (state ^ (state >>> 15)) >>> 0;
        state = Math.imul(state, 0x846ca68b) >>> 0;
        state = (state ^ (state >>> 16)) >>> 0;
        return (state >>> 0) / 4294967296;
      };
      try {
        const inv = Inventory.create([Player.User, Player.Opponent], rand);
        board = buildBoard(inv);
        inventory = inv;
      } catch {
        /* try next seed */
      }
    }
    // eslint-disable-next-line no-console
    console.log(`[bench] seed=${seed - 1} opp rack=`, inventory!.getTilesFor(Player.Opponent));
    const turns = Turns.create({ createUniqueId: () => 'id' });
    turns.startTurnFor(Player.User);
    turns.startTurnFor(Player.Opponent);

    const WARMUP = 1;
    const REPS = 5;
    const run = (): { best: number; count: number; ms: number } => {
      const ctx = TurnGenerationService.createContext(board, dictionary, inventory, turns);
      let count = 0;
      let best = -1;
      const t0 = performance.now();
      for (const r of TurnGenerationService.execute(ctx, Player.Opponent)) {
        count++;
        if (r.validationResult.score > best) best = r.validationResult.score;
      }
      return { best, count, ms: performance.now() - t0 };
    };

    for (let i = 0; i < WARMUP; i++) run();
    const times: Array<number> = [];
    let count = 0;
    let best = -1;
    for (let i = 0; i < REPS; i++) {
      const r = run();
      times.push(r.ms);
      count = r.count;
      best = r.best;
    }
    const min = Math.min(...times);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    // eslint-disable-next-line no-console
    console.log(
      `[bench] results=${count} bestScore=${best} reps=${REPS} avg=${avg.toFixed(1)}ms min=${min.toFixed(1)}ms all=[${times.map(t => t.toFixed(1)).join(', ')}]`,
    );
  }, 180_000);
});
