import { Player, ValidationStatus } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/reference/Layout/types.ts';
import { TileId } from '@/domain/model/Inventory/types.ts';
import { Placement, ValidationResult, UnvalidatedResult } from '@/domain/types.ts';

export default class Turn {
  private constructor(
    readonly player: Player,
    private initialPlacement: Placement,
    private validationResult: ValidationResult,
  ) {}

  static create({ player }: { player: Player }): Turn {
    const initialPlacement = Placement.create();
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

  setValidation(result: ValidationResult): void {
    this.validationResult = result;
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    this.initialPlacement.placeTile({ cell, tile });
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    this.initialPlacement.undoPlaceTile({ tile });
  }

  reset(): void {
    this.initialPlacement.reset();
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }
}
