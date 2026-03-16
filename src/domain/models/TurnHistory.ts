import { Player } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export type PlacementLinks = ReadonlyArray<Link>;

export enum ValidationStatus {
  Unvalidated = 'Unvalidated',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Valid = 'Valid',
}

export enum ValidationError {
  InvalidTilePlacement = 'error_tile_1',
  InvalidCellPlacement = 'error_cell_2',
  NoCellsUsableAsFirst = 'error_cell_3',
  WordNotInDictionary = 'error_tile_4',
}

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacementLinks = { placementLinks: ReadonlyArray<PlacementLinks> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };

export type ComputedValue = ComputedSequences | ComputedPlacementLinks | ComputedWords | ComputedScore;

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationError };
export type ValidResult = { status: ValidationStatus.Valid } & ComputedSequences &
  ComputedPlacementLinks &
  ComputedWords &
  ComputedScore;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;

export default class TurnHistory {
  private static readonly firstPlayer: Player = Player.User;

  private constructor(private turns: Array<Turn>) {}

  static create(): TurnHistory {
    return new TurnHistory([]);
  }

  get hasOpponentTurns(): boolean {
    return this.turns.length > 1;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.turns.length === 0) return TurnHistory.firstPlayer;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get currentTurn(): Turn {
    const last = this.turns.at(-1);
    if (!last) throw new Error('Current turn does not exist');
    return last;
  }

  get currentTurnCellSequence(): ReadonlyArray<CellIndex> | undefined {
    return this.currentTurn.cellSequence;
  }

  get currentTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    return this.currentTurn.tileSequence;
  }

  get previousTurnTileSequence(): ReadonlyArray<TileId> | undefined {
    // TODO rename
    return this.turns.at(-3)?.tileSequence;
  }

  getScoreFor(player: Player): number {
    return this.turns.filter(t => t.player === player).reduce((sum, t) => sum + (t.score ?? 0), 0);
  }

  get currentTurnPlacementLinks(): PlacementLinks {
    return this.currentTurn.placementLinks;
  }

  createNewTurnFor(player: Player): void {
    if (player !== this.nextPlayer) throw new Error(`Expected next player to be ${this.nextPlayer}, but got ${player}`);
    this.turns.push(Turn.create({ player }));
  }
}

class Turn {
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

  get error(): ValidationError | undefined {
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

  get placementLinks(): PlacementLinks {
    return this.initialPlacement.links();
  }

  setValidationResult(result: ValidationResult): void {
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
    this.setValidationResult({ status: ValidationStatus.Unvalidated });
  }
}

class Placement {
  private constructor(private readonly _links: Array<Link>) {}

  static create(): Placement {
    return new Placement([]);
  }

  links(): PlacementLinks {
    return [...this._links];
  }

  get length(): number {
    return this._links.length;
  }

  placeTile({ cell, tile }: { cell: CellIndex; tile: TileId }): void {
    if (this._links.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this._links.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
    this._links.push({ cell, tile } as Link);
    this._links.sort((a, b) => a.cell - b.cell);
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    const index = this._links.findIndex(link => link.tile === tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this._links.splice(index, 1);
  }

  reset(): void {
    this._links.length = 0;
  }
}
