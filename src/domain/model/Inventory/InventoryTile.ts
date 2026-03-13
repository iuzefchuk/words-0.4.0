import { Letter } from '@/domain/enums.ts';
import { LETTER_POINTS } from '@/domain/model/Inventory/constants.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';

export default class InventoryTile {
  private constructor(
    readonly id: TileId,
    readonly letter: Letter,
  ) {}

  static create({ letter }: { letter: Letter }): InventoryTile {
    const id = crypto.randomUUID();
    return new InventoryTile(id, letter);
  }

  get points(): number {
    return LETTER_POINTS[this.letter];
  }

  equals(other: InventoryTile): boolean {
    return this.id === other.id;
  }
}
