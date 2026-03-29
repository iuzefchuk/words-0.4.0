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
  readonly turns: Array<TurnSnapshot>;
  readonly userScore: number;
  readonly opponentScore: number;
};

export type TurnSnapshot = {
  readonly id: string;
  readonly player: Player;
  readonly tiles: Array<TileId>;
  readonly validationResult: ValidationResult;
};

export default class TurnTracker {
  private static readonly FIRST_PLAYER: Player = Player.User;

  private constructor(
    private readonly idGenerator: IdGenerator,
    private turns: Array<Turn>,
    private userScore: number,
    private opponentScore: number,
  ) {}

  static create(idGenerator: IdGenerator): TurnTracker {
    return new TurnTracker(idGenerator, [], 0, 0);
  }

  static restoreFromSnapshot(snapshot: TurnTrackerSnapshot, idGenerator: IdGenerator): TurnTracker {
    const turns = snapshot.turns.map(turn => Turn.restoreFromSnapshot(turn));
    return new TurnTracker(idGenerator, turns, snapshot.userScore, snapshot.opponentScore);
  }

  get snapshot(): TurnTrackerSnapshot {
    return {
      turns: this.turns.map(turn => turn.snapshot),
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
    return this.turns.at(-2)?.tilesView;
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
    this.currentTurn.setValidationResult(result);
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

  get snapshot(): TurnSnapshot {
    return { id: this.id, player: this.player, tiles: this.tiles, validationResult: this.validationResult };
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

  placeTile(tile: TileId): void {
    if (this.tiles.includes(tile)) throw new Error(`Tile ${tile} already connected`);
    this.tiles.push(tile);
  }

  undoPlaceTile({ tile }: { tile: TileId }): void {
    const index = this.tiles.indexOf(tile);
    if (index === -1) throw new Error(`Tile ${tile} not found`);
    this.tiles.splice(index, 1);
  }

  reset(): void {
    this.tiles.length = 0;
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }
}
