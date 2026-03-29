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

export type TurnView = {
  readonly hasPriorTurns: boolean;
  readonly currentPlayer: Player;
  readonly nextPlayer: Player;
  readonly currentTurnTiles: ReadonlyArray<TileId>;
  readonly currentTurnCells: ReadonlyArray<CellIndex> | undefined;
  readonly currentTurnScore: number | undefined;
  readonly currentTurnWords: ReadonlyArray<string> | undefined;
  readonly currentTurnIsValid: boolean;
  readonly previousTurnTiles: ReadonlyArray<TileId> | undefined;
  getScoreFor(player: Player): number;
};

export type TurnTrackerSnapshot = {
  turns: ReadonlyArray<TurnSnapshot>;
  userScore: number;
  opponentScore: number;
};

export type TurnSnapshot = {
  id: string;
  player: Player;
  tiles: ReadonlyArray<TileId>;
};

export default class TurnTracker {
  private static readonly FIRST_PLAYER: Player = Player.User;

  private constructor(
    private readonly idGenerator: IdGenerator,
    private turns: Array<Turn>,
    private userScore: number = 0,
    private opponentScore: number = 0,
  ) {}

  static create(idGenerator: IdGenerator): TurnTracker {
    return new TurnTracker(idGenerator, []);
  }

  static restoreFromSnapshot(snapshot: TurnTrackerSnapshot, idGenerator: IdGenerator): TurnTracker {
    const turns = snapshot.turns.map(turn => Turn.restore(turn.id, turn.player, turn.tiles as Array<TileId>));
    return new TurnTracker(idGenerator, turns, snapshot.userScore, snapshot.opponentScore);
  }

  get snapshot(): TurnTrackerSnapshot {
    return {
      turns: this.turns,
      userScore: this.userScore,
      opponentScore: this.opponentScore,
    };
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

  get leaderByScore(): Player | null {
    const userScore = this.getScoreFor(Player.User);
    const opponentScore = this.getScoreFor(Player.Opponent);
    const scoresAreTied = userScore === opponentScore;
    if (scoresAreTied) return null;
    return userScore > opponentScore ? Player.User : Player.Opponent;
  }

  get loserByScore(): Player | null {
    if (this.leaderByScore === null) return null;
    return this.leaderByScore === Player.User ? Player.Opponent : Player.User;
  }

  getScoreFor(player: Player): number {
    return player === Player.User ? this.userScore : this.opponentScore;
  }

  commitCurrentTurnScore(): void {
    const { score, player } = this.currentTurn;
    if (score === undefined) return;
    if (player === Player.User) this.userScore += score;
    else this.opponentScore += score;
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
}

class Turn {
  private constructor(
    readonly id: string,
    readonly player: Player,
    private _tiles: Array<TileId>,
    private _validationResult: ValidationResult = { status: ValidationStatus.Unvalidated },
  ) {}

  static create({ player, idGenerator }: { player: Player; idGenerator: IdGenerator }): Turn {
    const id = idGenerator.execute();
    return new Turn(id, player, []);
  }

  static restore(id: string, player: Player, tiles: Array<TileId>): Turn {
    return new Turn(id, player, tiles);
  }

  set validationResult(result: ValidationResult) {
    this._validationResult = result;
  }

  get tiles(): ReadonlyArray<TileId> {
    return this._tiles;
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
