import { Player } from '@/domain/enums.ts';
import { type CellIndex, type Placement } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import { IdGenerator } from '@/shared/ports.ts';

export enum TurnOutcomeType {
  Save = 'Save',
  Pass = 'Pass',
  Resign = 'Resign',
}

export enum ValidationStatus {
  Unvalidated = 'Unvalidated',
  Pending = 'Pending',
  Invalid = 'Invalid',
  Valid = 'Valid',
}

export enum ValidationError {
  InvalidTilePlacement = 'InvalidTilePlacement',
  InvalidCellPlacement = 'InvalidCellPlacement',
  NoCellsUsableAsFirst = 'NoCellsUsableAsFirst',
  WordNotInDictionary = 'WordNotInDictionary',
}

export type ComputedCells = { cells: ReadonlyArray<CellIndex> };
export type ComputedPlacements = { placements: ReadonlyArray<Placement> };
export type ComputedWords = { words: ReadonlyArray<string> };
export type ComputedScore = { score: number };
export type ComputedValue = ComputedCells | ComputedPlacements | ComputedWords | ComputedScore;
export type AllComputeds = ComputedCells & ComputedPlacements & ComputedWords & ComputedScore;
export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };
export type InvalidResult = { status: ValidationStatus.Invalid; error: ValidationError };
export type ValidResult = { status: ValidationStatus.Valid } & AllComputeds;
export type ValidationResult = UnvalidatedResult | InvalidResult | ValidResult;
export type TurnOutcome =
  | ({ type: TurnOutcomeType.Save; player: Player } & ComputedWords & ComputedScore)
  | { type: TurnOutcomeType.Pass; player: Player }
  | { type: TurnOutcomeType.Resign; player: Player };

export default class TurnTracker {
  private static readonly FIRST_PLAYER: Player = Player.User;

  private constructor(
    private readonly idGenerator: IdGenerator,
    private turns: Array<Turn>,
  ) {}

  static create({ idGenerator }: { idGenerator: IdGenerator }): TurnTracker {
    return new TurnTracker(idGenerator, []);
  }

  static hydrate(data: unknown): TurnTracker {
    return Object.setPrototypeOf(data, TurnTracker.prototype);
  }

  get hasPriorTurns(): boolean {
    return this.turns.length > 1;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.turns.length === 0) return TurnTracker.FIRST_PLAYER;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get currentTurnTiles(): ReadonlyArray<TileId> {
    return this.currentTurn.tiles;
  }

  get currentTurnCells(): ReadonlyArray<CellIndex> | undefined {
    return this.currentTurn.cells;
  }

  get currentTurnError(): ValidationError | undefined {
    return this.currentTurn.error;
  }

  get currentTurnScore(): number | undefined {
    return this.currentTurn.score;
  }

  get currentTurnWords(): ReadonlyArray<string> | undefined {
    return this.currentTurn.words;
  }

  get currentTurnIsValid(): boolean {
    return this.currentTurn.isValid;
  }

  get previousTurnTiles(): ReadonlyArray<TileId> | undefined {
    return this.turns.at(-2)?.tiles;
  }

  get outcomeHistory(): ReadonlyArray<TurnOutcome> {
    return this.turns.map(turn => turn.outcome).filter(turn => turn !== undefined);
  }

  getScoreFor(player: Player): number {
    return this.turns
      .filter(turn => turn.player === player && turn.id !== this.currentTurn.id)
      .reduce((sum, turn) => sum + (turn.score ?? 0), 0);
  }

  willPlayerPassBeResign(player: Player): boolean {
    const lastTurn = this.completedTurns.findLast(turn => turn.player === player);
    return lastTurn?.outcomeType === TurnOutcomeType.Pass;
  }

  recordCurrentTurnOutcome(type: TurnOutcomeType): void {
    this.currentTurn.outcomeType = type;
  }

  placeTileInCurrentTurn(tile: TileId): void {
    this.currentTurn.placeTile(tile);
  }

  undoPlaceTileInCurrentTurn({ tile }: { tile: TileId }): void {
    this.currentTurn.undoPlaceTile({ tile });
  }

  setCurrentTurnValidation(result: ValidationResult): void {
    this.currentTurn.validationResult = result;
  }

  resetCurrentTurn(): void {
    this.currentTurn.reset();
  }

  createNewTurnFor(player: Player): void {
    if (player !== this.nextPlayer) throw new Error(`Expected next player to be ${this.nextPlayer}, but got ${player}`);
    this.turns.push(Turn.create({ player, idGenerator: this.idGenerator }));
  }

  private get currentTurn(): Turn {
    const last = this.turns.at(-1);
    if (!last) throw new Error('Current turn does not exist');
    return last;
  }

  private get completedTurns(): ReadonlyArray<Turn> {
    return this.turns.slice(0, -1);
  }
}

class Turn {
  private constructor(
    readonly id: string,
    readonly player: Player,
    private _tiles: Array<TileId>,
    private _validationResult: ValidationResult,
    private _outcomeType: TurnOutcomeType | undefined,
  ) {}

  static create({ player, idGenerator }: { player: Player; idGenerator: IdGenerator }): Turn {
    const id = idGenerator.execute();
    const validationResult: UnvalidatedResult = { status: ValidationStatus.Unvalidated };
    return new Turn(id, player, [], validationResult, undefined);
  }

  get outcome(): TurnOutcome | undefined {
    if (this._outcomeType === TurnOutcomeType.Save) {
      if (this._validationResult.status !== ValidationStatus.Valid) {
        throw new Error('Can`t log output for invalid turn');
      }
      return {
        type: TurnOutcomeType.Save,
        player: this.player,
        words: this._validationResult.words,
        score: this._validationResult.score,
      };
    }
    if (this._outcomeType === TurnOutcomeType.Pass) return { type: TurnOutcomeType.Pass, player: this.player };
  }

  get outcomeType(): TurnOutcomeType | undefined {
    return this._outcomeType;
  }

  set outcomeType(type: TurnOutcomeType) {
    if (this._outcomeType !== undefined) throw new Error(`Outcome already set to ${this._outcomeType}`);
    if (type === TurnOutcomeType.Save && !this.isValid) throw new Error('Can`t log output for invalid turn');
    this._outcomeType = type;
  }

  set validationResult(result: ValidationResult) {
    this._validationResult = result;
  }

  get tiles(): ReadonlyArray<TileId> {
    return [...this._tiles];
  }

  get cells(): ReadonlyArray<CellIndex> | undefined {
    return this._validationResult.status === ValidationStatus.Valid ? this._validationResult.cells : undefined;
  }

  get error(): ValidationError | undefined {
    return this._validationResult.status === ValidationStatus.Invalid ? this._validationResult.error : undefined;
  }

  get score(): number | undefined {
    return this._validationResult.status === ValidationStatus.Valid ? this._validationResult.score : undefined;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this._validationResult.status === ValidationStatus.Valid ? this._validationResult.words : undefined;
  }

  get isValid(): boolean {
    return this._validationResult.status === ValidationStatus.Valid;
  }

  placeTile(tile: TileId): void {
    if (this._tiles.includes(tile)) throw new Error(`Tile ${tile} already connected`);
    this._tiles.push(tile);
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    const index = this._tiles.indexOf(tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this._tiles.splice(index, 1);
  }

  reset(): void {
    this._tiles.length = 0;
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }
}
