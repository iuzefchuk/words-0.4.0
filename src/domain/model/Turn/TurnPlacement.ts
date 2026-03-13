import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export default class TurnPlacement {
  private constructor(private readonly links: Array<Link>) {}

  static create(): TurnPlacement {
    return new TurnPlacement([]);
  }

  static createFrom(links: Array<Link>): TurnPlacement {
    return new TurnPlacement(links);
  }

  get length(): number {
    return this.links.length;
  }

  get isEmpty(): boolean {
    return this.links.length === 0;
  }

  get cellSequence(): ReadonlyArray<CellIndex> {
    return this.links.map(link => link.cell);
  }

  get tileSequence(): ReadonlyArray<TileId> {
    return this.links.map(link => link.tile);
  }

  [Symbol.iterator](): Iterator<Link> {
    return this.links[Symbol.iterator]();
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.ensureAbsence(cell, tile);
    this.links.push({ cell, tile } as Link);
    this.links.sort((a, b) => a.cell - b.cell);
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    const index = this.links.findIndex(link => link.tile === tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.links.splice(index, 1);
  }

  reset(): void {
    this.links.length = 0;
  }

  push(link: Link): void {
    this.links.push(link);
  }

  pop(): Link | undefined {
    return this.links.pop();
  }

  private ensureAbsence(cell: CellIndex, tile: TileId): void {
    if (this.links.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this.links.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
  }
}
