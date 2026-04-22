import { Player } from '@/domain/enums.ts';
import { Cell } from '@/domain/models/board/types.ts';
import { Tile } from '@/domain/models/inventory/types.ts';
import { ValidationError, ValidationStatus } from '@/domain/models/turns/enums.ts';
import { ValidationResult } from '@/domain/models/turns/types.ts';
import { IdentityService } from '@/domain/types/ports.ts';

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

  get tilesView(): ReadonlyArray<Tile> {
    return this.tiles;
  }

  get words(): ReadonlyArray<string> | undefined {
    return this.validationResult.status === ValidationStatus.Valid ? this.validationResult.words : undefined;
  }

  private constructor(
    readonly id: string,
    readonly player: Player,
    private readonly tiles: Array<Tile>,
    private validationResult: ValidationResult = { status: ValidationStatus.Unvalidated },
  ) {}

  static clone(source: Turn): Turn {
    return new Turn(source.id, source.player, [...source.tiles], { ...source.validationResult });
  }

  static create({ identityService, player }: { identityService: IdentityService; player: Player }): Turn {
    const id = identityService.createUniqueId();
    return new Turn(id, player, []);
  }

  addTile(tile: Tile): void {
    if (this.tiles.includes(tile)) throw new Error(`tile ${tile} is already in current turn`);
    this.tiles.push(tile);
  }

  removeTile(tile: Tile): void {
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

  private get currentTurn(): Turn {
    const last = this.history.at(-1);
    if (last === undefined) throw new ReferenceError('expected current turn, got undefined');
    return last;
  }

  private constructor(
    private readonly identityService: IdentityService,
    private readonly history: Array<Turn>,
  ) {}

  static clone(source: Turns, identityService?: IdentityService): Turns {
    return new Turns(
      identityService ?? source.identityService,
      source.history.map(turn => Turn.clone(turn)),
    );
  }

  static create(identityService: IdentityService): Turns {
    return new Turns(identityService, []);
  }

  addPlacedTile(tile: Tile): void {
    this.currentTurn.addTile(tile);
  }

  recordValidationResult(result: ValidationResult): void {
    this.currentTurn.setValidationResult(result);
  }

  removePlacedTile(tile: Tile): void {
    this.currentTurn.removeTile(tile);
  }

  resetCurrentTurn(): void {
    this.currentTurn.reset();
  }

  startTurnFor(player: Player): void {
    if (player !== this.nextPlayer) throw new Error(`expected next player to be ${this.nextPlayer}, got ${player}`);
    const newTurn = Turn.create({ identityService: this.identityService, player });
    this.history.push(newTurn);
  }
}
