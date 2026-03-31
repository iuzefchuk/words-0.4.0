import { Player } from '@/domain/enums.ts';
import { type CellIndex, type Placement } from '@/domain/models/Board.ts';
import { TileId } from '@/domain/models/Inventory.ts';
import { IdGenerator } from '@/domain/ports.ts';

export enum ValidationError {
  InvalidCellPlacement = 'InvalidCellPlacement',
  InvalidTilePlacement = 'InvalidTilePlacement',
  NoCellsUsableAsFirst = 'NoCellsUsableAsFirst',
  WordNotInDictionary = 'WordNotInDictionary',
}

export enum ValidationStatus {
  Invalid = 'Invalid',
  Pending = 'Pending',
  Unvalidated = 'Unvalidated',
  Valid = 'Valid',
}

export type AllComputeds = ComputedCells & ComputedPlacements & ComputedScore & ComputedWords;

export type ComputedCells = { cells: ReadonlyArray<CellIndex> };

export type ComputedPlacements = { placements: ReadonlyArray<Placement> };

export type ComputedScore = { score: number };

export type ComputedValue = ComputedCells | ComputedPlacements | ComputedScore | ComputedWords;

export type ComputedWords = { words: ReadonlyArray<string> };

export type InvalidResult = { error: ValidationError; status: ValidationStatus.Invalid };

export type TurnSnapshot = {
  readonly id: string;
  readonly player: Player;
  readonly tiles: Array<TileId>;
  readonly validationResult: ValidationResult;
};

export type TurnsSnapshot = {
  readonly turns: Array<TurnSnapshot>;
};

export type TurnsView = {
  readonly currentPlayer: Player;
  readonly currentTurnCells: ReadonlyArray<CellIndex> | undefined;
  readonly currentTurnIsValid: boolean;
  readonly currentTurnScore: number | undefined;
  readonly currentTurnTiles: ReadonlyArray<TileId>;
  readonly currentTurnWords: ReadonlyArray<string> | undefined;
  readonly historyHasPriorTurns: boolean;
  readonly nextPlayer: Player;
  readonly previousTurnTiles: ReadonlyArray<TileId> | undefined;
};

export type UnvalidatedResult = { status: ValidationStatus.Unvalidated };

export type ValidationResult = InvalidResult | UnvalidatedResult | ValidResult;

export type ValidResult = { status: ValidationStatus.Valid } & AllComputeds;

class Turn {
  get cells(): ReadonlyArray<CellIndex> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.cells : undefined;
  }

  get error(): undefined | ValidationError {
    return this.validationResult.status === ValidationStatus.Invalid ? this.validationResult.error : undefined;
  }

  get isValid(): boolean {
    return this.validationResult.status === ValidationStatus.Valid;
  }

  get score(): number | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.score : undefined;
  }

  get snapshot(): TurnSnapshot {
    return { id: this.id, player: this.player, tiles: [...this.tiles], validationResult: this.validationResult };
  }

  get tilesView(): ReadonlyArray<TileId> {
    return this.tiles;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.words : undefined;
  }

  private constructor(
    readonly id: string,
    readonly player: Player,
    private tiles: Array<TileId>,
    private validationResult: ValidationResult = { status: ValidationStatus.Unvalidated },
  ) {}

  static clone(turn: Turn): Turn {
    return new Turn(turn.id, turn.player, [...turn.tiles], turn.validationResult);
  }

  static create({ idGenerator, player }: { idGenerator: IdGenerator; player: Player }): Turn {
    const id = idGenerator.execute();
    return new Turn(id, player, []);
  }

  static restoreFromSnapshot(snapshot: TurnSnapshot): Turn {
    return new Turn(snapshot.id, snapshot.player, snapshot.tiles, snapshot.validationResult);
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

  setValidationResult(result: ValidationResult) {
    this.validationResult = result;
  }
}

export default class Turns {
  private static readonly FIRST_PLAYER: Player = Player.User;

  get currentPlayer(): Player {
    return this.currentTurn.player;
  }

  get currentTurnCells(): ReadonlyArray<CellIndex> | undefined {
    return this.currentTurn.cells;
  }

  get currentTurnIsValid(): boolean {
    return this.currentTurn.isValid;
  }

  get currentTurnScore(): number | undefined {
    return this.currentTurn.score;
  }

  get currentTurnTiles(): ReadonlyArray<TileId> {
    return this.currentTurn.tilesView;
  }

  get currentTurnWords(): ReadonlyArray<string> | undefined {
    return this.currentTurn.words;
  }

  get historyHasPriorTurns(): boolean {
    return this.history.length > 1;
  }

  get nextPlayer(): Player {
    if (this.history.length === 0) return Turns.FIRST_PLAYER;
    return this.currentPlayer === Player.User ? Player.Opponent : Player.User;
  }

  get previousTurnTiles(): ReadonlyArray<TileId> | undefined {
    return this.history.at(-2)?.tilesView;
  }

  get snapshot(): TurnsSnapshot {
    return {
      turns: this.history.map(turn => turn.snapshot),
    };
  }

  private get currentTurn(): Turn {
    const last = this.history.at(-1);
    if (!last) throw new Error('Current turn does not exist');
    return last;
  }

  private constructor(
    private readonly idGenerator: IdGenerator,
    private history: Array<Turn>,
  ) {}

  static clone(turns: Turns): Turns {
    const clonedHistory = turns.history.map(turn => Turn.clone(turn));
    return new Turns(turns.idGenerator, clonedHistory);
  }

  static create(idGenerator: IdGenerator): Turns {
    return new Turns(idGenerator, []);
  }

  static restoreFromSnapshot(snapshot: TurnsSnapshot, idGenerator: IdGenerator): Turns {
    const turns = snapshot.turns.map(turn => Turn.restoreFromSnapshot(turn));
    return new Turns(idGenerator, turns);
  }

  recordPlacedTile(tile: TileId): void {
    this.currentTurn.addTile(tile);
  }

  recordValidationResult(result: ValidationResult): void {
    this.currentTurn.setValidationResult(result);
  }

  resetCurrentTurn(): void {
    this.currentTurn.reset();
  }

  startTurnFor(player: Player): void {
    if (player !== this.nextPlayer) throw new Error(`Expected next player to be ${this.nextPlayer}, but got ${player}`);
    this.history.push(Turn.create({ idGenerator: this.idGenerator, player }));
  }

  undoRecordPlacedTile({ tile }: { tile: TileId }): void {
    this.currentTurn.removeTile({ tile });
  }
}
