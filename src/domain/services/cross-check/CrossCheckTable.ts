import { GameAxis, GameLetter } from '@/domain/enums.ts';
import { GameCell } from '@/domain/types/index.ts';

export default class CrossCheckTable {
  static readonly ALL_LETTERS_MASK = (1 << Object.values(GameLetter).length) - 1;

  get buffer(): ArrayBuffer | SharedArrayBuffer {
    return this.data.buffer;
  }

  private readonly data: Uint32Array;

  private readonly yOffset: number;

  private constructor(buffer: ArrayBuffer | SharedArrayBuffer, cellCount: number) {
    this.data = new Uint32Array(buffer);
    this.yOffset = cellCount;
  }

  static create(cellCount: number): CrossCheckTable {
    const byteLength = cellCount * 2 * Uint32Array.BYTES_PER_ELEMENT;
    return new CrossCheckTable(new SharedArrayBuffer(byteLength), cellCount);
  }

  static createFromBuffer(buffer: ArrayBuffer | SharedArrayBuffer, cellCount: number): CrossCheckTable {
    return new CrossCheckTable(buffer, cellCount);
  }

  getMask(axis: GameAxis, cell: GameCell): number {
    const mask = this.data[(axis === GameAxis.X ? 0 : this.yOffset) + cell];
    if (mask === undefined) throw new ReferenceError(`expected mask for axis ${axis} cell ${String(cell)}, got undefined`);
    return mask;
  }

  setMask(axis: GameAxis, cell: GameCell, mask: number): void {
    this.data[(axis === GameAxis.X ? 0 : this.yOffset) + cell] = mask;
  }
}
