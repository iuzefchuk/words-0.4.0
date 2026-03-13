import { Player } from '@/domain/enums.ts';
import { CellIndex } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';

export type Link = { readonly cell: CellIndex; readonly tile: TileId };

export enum ValidationStatus {
  Unvalidated = 'Unvalidated',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Valid = 'Valid',
}

export enum ValidationErrors {
  InvalidTilePlacement = 'error_tile_1',
  InvalidCellPlacement = 'error_cell_2',
  NoCellsUsableAsFirst = 'error_cell_3',
  WordNotInDictionary = 'error_tile_4',
}

type ComputedSequences = { sequences: { cell: ReadonlyArray<CellIndex>; tile: ReadonlyArray<TileId> } };
type ComputedPlacements = { placements: ReadonlyArray<Placement> };
type ComputedWords = { words: ReadonlyArray<string> };
type ComputedScore = { score: number };

export type ComputedValue = ComputedSequences | ComputedPlacements | ComputedWords | ComputedScore;

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationErrors };
export type ValidResult = { status: ValidationStatus.Valid } & ComputedSequences &
  ComputedPlacements &
  ComputedWords &
  ComputedScore;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;

export default class TurnHistory {
  private static readonly firstPlayer: Player = Player.User;

  private constructor(private turns: Array<Turn>) {}

  static create(): TurnHistory {
    return new TurnHistory([]);
  }

  get isEmpty(): boolean {
    return this.turns.length === 0;
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
    return this.turns.at(-2)?.tileSequence;
  }

  getScoreFor(player: Player): number {
    return this.turns.filter(t => t.player === player).reduce((sum, t) => sum + (t.score ?? 0), 0);
  }

  createNewTurnFor(player: Player): void {
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

export class Placement {
  private constructor(private readonly links: Array<Link>) {}

  static create(): Placement {
    return new Placement([]);
  }

  static createFrom(links: Array<Link>): Placement {
    return new Placement(links);
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
    if (this.links.some(link => link.cell === cell)) throw new Error(`Cell ${cell} already connected`);
    if (this.links.some(link => link.tile === tile)) throw new Error(`Tile ${tile} already connected`);
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
}
