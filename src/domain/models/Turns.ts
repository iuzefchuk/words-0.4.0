import { Player } from '@/domain/enums.ts';
import { type CellIndex, type Placement } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import { IdGenerator } from '@/domain/ports.ts';

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

export type TurnsView = {
  readonly historyHasPriorTurns: boolean;
  readonly currentPlayer: Player;
  readonly nextPlayer: Player;
  readonly currentTurnTiles: ReadonlyArray<TileId>;
  readonly currentTurnCells: ReadonlyArray<CellIndex> | undefined;
  readonly currentTurnScore: number | undefined;
  readonly currentTurnWords: ReadonlyArray<string> | undefined;
  readonly currentTurnIsValid: boolean;
  readonly previousTurnTiles: ReadonlyArray<TileId> | undefined;
};

export type TurnsSnapshot = {
  readonly turns: Array<TurnSnapshot>;
};

export type TurnSnapshot = {
  readonly id: string;
  readonly player: Player;
  readonly tiles: Array<TileId>;
  readonly validationResult: ValidationResult;
};

export default class Turns {
  private static readonly FIRST_PLAYER: Player = Player.User;

  private constructor(
    private readonly idGenerator: IdGenerator,
    private history: Array<Turn>,
  ) {}

  static create(idGenerator: IdGenerator): Turns {
    return new Turns(idGenerator, []);
  }

  static restoreFromSnapshot(snapshot: TurnsSnapshot, idGenerator: IdGenerator): Turns {
    const turns = snapshot.turns.map(turn => Turn.restoreFromSnapshot(turn));
    return new Turns(idGenerator, turns);
  }

  static clone(turns: Turns): Turns {
    const clonedHistory = turns.history.map(turn => Turn.clone(turn));
    return new Turns(turns.idGenerator, clonedHistory);
  }

  get snapshot(): TurnsSnapshot {
    return {
      turns: this.history.map(turn => turn.snapshot),
    };
  }

  get historyHasPriorTurns(): boolean {
    return this.history.length > 1;
  }

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get nextPlayer(): Player {
    if (this.history.length === 0) return Turns.FIRST_PLAYER;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get currentTurnTiles(): ReadonlyArray<TileId> {
    return this.currentTurn.tilesView;
  }

  get currentTurnCells(): ReadonlyArray<CellIndex> | undefined {
    return this.currentTurn.cells;
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
    return this.history.at(-2)?.tilesView;
  }

  recordPlacedTile(tile: TileId): void {
    this.currentTurn.addTile(tile);
  }

  undoRecordPlacedTile({ tile }: { tile: TileId }): void {
    this.currentTurn.removeTile({ tile });
  }

  recordValidationResult(result: ValidationResult): void {
    this.currentTurn.setValidationResult(result);
  }

  resetCurrentTurn(): void {
    this.currentTurn.reset();
  }

  startTurnFor(player: Player): void {
    if (player !== this.nextPlayer) throw new Error(`Expected next player to be ${this.nextPlayer}, but got ${player}`);
    this.history.push(Turn.create({ player, idGenerator: this.idGenerator }));
  }

  private get currentTurn(): Turn {
    const last = this.history.at(-1);
    if (!last) throw new Error('Current turn does not exist');
    return last;
  }
}

class Turn {
  private constructor(
    readonly id: string,
    readonly player: Player,
    private tiles: Array<TileId>,
    private validationResult: ValidationResult = { status: ValidationStatus.Unvalidated },
  ) {}

  static create({ player, idGenerator }: { player: Player; idGenerator: IdGenerator }): Turn {
    const id = idGenerator.execute();
    return new Turn(id, player, []);
  }

  static restoreFromSnapshot(snapshot: TurnSnapshot): Turn {
    return new Turn(snapshot.id, snapshot.player, snapshot.tiles, snapshot.validationResult);
  }

  static clone(turn: Turn): Turn {
    return new Turn(turn.id, turn.player, [...turn.tiles], turn.validationResult);
  }

  get snapshot(): TurnSnapshot {
    return { id: this.id, player: this.player, tiles: [...this.tiles], validationResult: this.validationResult };
  }

  get tilesView(): ReadonlyArray<TileId> {
    return this.tiles;
  }

  get cells(): ReadonlyArray<CellIndex> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.cells : undefined;
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

  setValidationResult(result: ValidationResult) {
    this.validationResult = result;
  }

  addTile(tile: TileId): void {
    if (this.tiles.includes(tile)) throw new Error(`Tile ${tile} already connected`);
    this.tiles.push(tile);
  }

  removeTile({ tile }: { tile: TileId }): void {
    const index = this.tiles.indexOf(tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.tiles.splice(index, 1);
  }

  reset(): void {
    this.tiles.length = 0;
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }
}
