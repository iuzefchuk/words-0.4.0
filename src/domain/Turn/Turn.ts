import { Player, ValidationStatus } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/Board/types.ts';
import { TileId } from '@/domain/Inventory/types.ts';
import { Placement, Link, ValidationResult, UnvalidatedResult } from '@/domain/types.ts';

export default class Turn {
  private constructor(
    readonly player: Player,
    private initialPlacement: Placement,
    private validationResult: ValidationResult,
  ) {}

  static create({ player }: { player: Player }): Turn {
    const initialPlacement: Placement = [];
    const validationResult: UnvalidatedResult = { status: ValidationStatus.Unvalidated };
    return new Turn(player, initialPlacement, validationResult);
  }

  get cellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.sequences.cell : undefined;
  }

  get tileSequence(): ReadonlyArray<TileId> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.sequences.tile : undefined;
  }

  get error(): string | undefined {
    return this.validationResult.status === ValidationStatus.Invalid ? this.validationResult.error : undefined;
  }

  get score(): number | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.score : undefined;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.words : undefined;
  }

  get isValid(): boolean {
    return this.validationResult.status === ValidationStatus.Valid;
  }

  get placement(): Placement {
    return this.initialPlacement;
  }

  get links(): ReadonlyArray<{ cell: CellIndex; tile: TileId }> {
    return this.initialPlacement;
  }

  setValidation(result: ValidationResult): void {
    this.validationResult = result;
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.validateCellAndTileAbsence(cell, tile);
    this.initialPlacement.push({ cell, tile } as Link);
    this.initialPlacement.sort((a, b) => a.cell - b.cell);
  }

  removeTile({ tile }: { tile: TileId }): void {
    const index = this.initialPlacement.findIndex(link => link.tile === tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.initialPlacement.splice(index, 1);
  }

  reset(): void {
    this.initialPlacement.length = 0;
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }

  private validateCellAndTileAbsence(cell: CellIndex, tile: TileId): void {
    if (this.initialPlacement.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this.initialPlacement.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
  }
}
