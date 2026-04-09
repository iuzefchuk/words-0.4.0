import { Player } from '@/domain/enums.ts';
import { Cell } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { ValidationError, ValidationStatus } from '@/domain/models/turns/enums.ts';
import { TurnSnapshot, TurnsSnapshot, ValidationResult } from '@/domain/models/turns/types.ts';
import { IdentityService } from '@/domain/types.ts';

class Turn {
  get cells(): ReadonlyArray<Cell> | undefined {
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

  get tilesView(): ReadonlyArray<Tile> {
    return this.tiles;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.words : undefined;
  }

  private constructor(
    readonly id: string,
    readonly player: Player,
    private tiles: Array<Tile>,
    private validationResult: ValidationResult = { status: ValidationStatus.Unvalidated },
  ) {}

  static clone(turn: Turn): Turn {
    return new Turn(turn.id, turn.player, [...turn.tiles], turn.validationResult);
  }

  static create({ identityService, player }: { identityService: IdentityService; player: Player }): Turn {
    const id = identityService.createUniqueId();
    return new Turn(id, player, []);
  }

  static restoreFromSnapshot(snapshot: TurnSnapshot): Turn {
    return new Turn(snapshot.id, snapshot.player, snapshot.tiles, snapshot.validationResult);
  }

  addTile(tile: Tile): void {
    if (this.tiles.includes(tile)) throw new Error(`Tile ${tile} already connected`);
    this.tiles.push(tile);
  }

  removeTile({ tile }: { tile: Tile }): void {
    const index = this.tiles.indexOf(tile);
    if (index === -1) throw new ReferenceError(`Tile ${tile} not found`);
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

  get currentTurnCells(): ReadonlyArray<Cell> | undefined {
    return this.currentTurn.cells;
  }

  get currentTurnIsValid(): boolean {
    return this.currentTurn.isValid;
  }

  get currentTurnScore(): number | undefined {
    return this.currentTurn.score;
  }

  get currentTurnTiles(): ReadonlyArray<Tile> {
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

  get previousTurnTiles(): ReadonlyArray<Tile> | undefined {
    return this.history.at(-2)?.tilesView;
  }

  get snapshot(): TurnsSnapshot {
    return {
      history: this.history.map(turn => turn.snapshot),
    };
  }

  private get currentTurn(): Turn {
    const last = this.history.at(-1);
    if (last === undefined) throw new ReferenceError('Current turn does not exist');
    return last;
  }

  private constructor(
    private readonly identityService: IdentityService,
    private history: Array<Turn>,
  ) {}

  static clone(turns: Turns): Turns {
    const clonedHistory = turns.history.map(turn => Turn.clone(turn));
    return new Turns(turns.identityService, clonedHistory);
  }

  static create(identityService: IdentityService): Turns {
    return new Turns(identityService, []);
  }

  static restoreFromSnapshot(identityService: IdentityService, snapshot: TurnsSnapshot): Turns {
    const history = snapshot.history.map(turn => Turn.restoreFromSnapshot(turn));
    return new Turns(identityService, history);
  }

  recordPlacedTile(tile: Tile): void {
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
    this.history.push(Turn.create({ identityService: this.identityService, player }));
  }

  undoRecordPlacedTile({ tile }: { tile: Tile }): void {
    this.currentTurn.removeTile({ tile });
  }
}
