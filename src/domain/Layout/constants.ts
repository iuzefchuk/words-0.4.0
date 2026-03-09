import { Bonus } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/Layout/types/shared.ts';

export const BONUS_CELL_INDEXES: Record<Bonus, ReadonlyArray<CellIndex>> = {
  [Bonus.DoubleLetter]: [
    7, 16, 28, 36, 38, 66, 68, 92, 94, 100, 102, 105, 119, 122, 124, 130, 132, 156, 158, 186, 188, 196, 208, 217,
  ],
  [Bonus.TripleLetter]: [0, 14, 20, 24, 48, 56, 76, 80, 84, 88, 136, 140, 144, 148, 168, 176, 200, 204, 210, 224],
  [Bonus.DoubleWord]: [32, 42, 52, 64, 70, 108, 116, 154, 160, 172, 182, 192],
  [Bonus.TripleWord]: [4, 10, 60, 74, 150, 164, 214, 220],
} as const;
