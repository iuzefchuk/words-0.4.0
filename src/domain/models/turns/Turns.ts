import { GamePlayer } from '@/domain/enums.ts';
import { ValidationError, ValidationStatus } from '@/domain/models/turns/enums.ts';
import { ValidationResult } from '@/domain/models/turns/types.ts';
import { GameCell, GameTile } from '@/domain/types/index.ts';
import { IdentifierService } from '@/domain/types/ports.ts';

class Turn {
  get cells(): ReadonlyArray<GameCell> | undefined {
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

  get tilesView(): ReadonlyArray<GameTile> {
    return this.tiles;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.words : undefined;
  }

  private constructor(
    readonly id: string,
    readonly player: GamePlayer,
    private readonly tiles: Array<GameTile>,
    private validationResult: ValidationResult = { status: ValidationStatus.Unvalidated },
  ) {}

  static clone(source: Turn): Turn {
    return new Turn(source.id, source.player, [...source.tiles], { ...source.validationResult });
  }

  static create({ identifier, player }: { identifier: IdentifierService; player: GamePlayer }): Turn {
    const id = identifier.create();
    return new Turn(id, player, []);
  }

  addTile(tile: GameTile): void {
    if (this.tiles.includes(tile)) throw new Error(`tile ${tile} is already in current turn`);
    this.tiles.push(tile);
  }

  removeTile(tile: GameTile): void {
    const index = this.tiles.indexOf(tile);
    if (index === -1) throw new ReferenceError(`tile ${tile} is not in current turn`);
    this.tiles.splice(index, 1);
  }

  reset(): void {
    this.tiles.length = 0;
    this.validationResult = { status: ValidationStatus.Unvalidated };
  }

  setValidationResult(result: ValidationResult): void {
    this.validationResult = result;
  }
}

export default class Turns {
  private static readonly FIRST_PLAYER: GamePlayer = GamePlayer.User;

  get currentPlayer(): GamePlayer {
    return this.currentTurn.player;
  }

  get currentTurnCells(): ReadonlyArray<GameCell> | undefined {
    return this.currentTurn.cells;
  }

  get currentTurnIsValid(): boolean {
    return this.currentTurn.isValid;
  }

  get currentTurnScore(): number | undefined {
    return this.currentTurn.score;
  }

  get currentTurnTiles(): ReadonlyArray<GameTile> {
    return this.currentTurn.tilesView;
  }

  get currentTurnWords(): ReadonlyArray<string> | undefined {
    return this.currentTurn.words;
  }

  get historyHasPriorTurns(): boolean {
    return this.history.length > 1;
  }

  get nextPlayer(): GamePlayer {
    if (this.history.length === 0) return Turns.FIRST_PLAYER;
    return this.currentPlayer === GamePlayer.User ? GamePlayer.Opponent : GamePlayer.User;
  }

  get previousTurnTiles(): ReadonlyArray<GameTile> | undefined {
    return this.history.at(-2)?.tilesView;
  }

  private get currentTurn(): Turn {
    const last = this.history.at(-1);
    if (last === undefined) throw new ReferenceError('expected current turn, got undefined');
    return last;
  }

  private constructor(
    private readonly identifier: IdentifierService,
    private readonly history: Array<Turn>,
  ) {}

  static clone(source: Turns, identifier?: IdentifierService): Turns {
    return new Turns(
      identifier ?? source.identifier,
      source.history.map(turn => Turn.clone(turn)),
    );
  }

  static create(identifier: IdentifierService): Turns {
    return new Turns(identifier, []);
  }

  addPlacedTile(tile: GameTile): void {
    this.currentTurn.addTile(tile);
  }

  recordValidationResult(result: ValidationResult): void {
    this.currentTurn.setValidationResult(result);
  }

  removePlacedTile(tile: GameTile): void {
    this.currentTurn.removeTile(tile);
  }

  resetCurrentTurn(): void {
    this.currentTurn.reset();
  }

  startTurnFor(player: GamePlayer): void {
    if (player !== this.nextPlayer) throw new Error(`expected next player to be ${this.nextPlayer}, got ${player}`);
    const newTurn = Turn.create({ identifier: this.identifier, player });
    this.history.push(newTurn);
  }
}
