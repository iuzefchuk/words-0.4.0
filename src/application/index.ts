import Board, { Bonus } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import { Letter, Player } from '@/domain/enums.ts';
import { DomainEvent, EventCollector } from '@/domain/events.ts';
import { Action, ActionType } from '@/domain/models/ActionTracker.ts';
import Inventory from '@/domain/models/Inventory.ts';
import { TIME } from '@/shared/constants.ts';
import { GameContext, GameCell, GameTile, GameState, SaveTurnResult } from '@/application/types.ts';
import GameStateQuery from '@/application/queries/GameState.ts';
import TurnValidator from '@/application/services/TurnValidator.ts';
import TurnDirector from '@/application/TurnDirector.ts';
import PassTurnCommand from '@/application/commands/PassTurn.ts';
import PlaceTileCommand from '@/application/commands/PlaceTile.ts';
import ResignGameCommand from '@/application/commands/ResignGame.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import UndoPlaceTileCommand from '@/application/commands/UndoPlaceTile.ts';
import PlacementLinksGeneratorWorker from '@/infrastructure/PlacementLinksGeneratorWorker/index.ts';
import IndexedDbDictionaryFactory from '@/infrastructure/IndexedDbDictionaryFactory.ts';
import IdGenerator from '@/infrastructure/CryptoIdGenerator.ts';
import Clock from '@/infrastructure/DateApiClock.ts';

export default class Game {
  private static readonly ACTION_EVENTS: Partial<Record<ActionType, DomainEvent>> = {
    [ActionType.Won]: DomainEvent.GameWon,
    [ActionType.Tied]: DomainEvent.GameTied,
    [ActionType.Lost]: DomainEvent.GameLost,
  };
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;
  private static readonly CLOCK = new Clock();
  static readonly BONUSES = Bonus;
  static readonly LETTERS = Letter;
  private readonly placementLinksGeneratorWorker = new PlacementLinksGeneratorWorker();
  private readonly events = new EventCollector();
  private static dictionary: Dictionary;
  private isMutable: boolean = true;

  private constructor(
    private board: Board,
    private inventory: Inventory,
    private turnDirector: TurnDirector,
  ) {}

  static async start(): Promise<Game> {
    if (!Game.dictionary) Game.dictionary = await IndexedDbDictionaryFactory.create();
    const idGenerator = new IdGenerator();
    const players = Object.values(Player);
    const board = Board.create();
    const inventory = Inventory.create({ players, idGenerator });
    const turnDirector = TurnDirector.create({ board, idGenerator });
    return new Game(board, inventory, turnDirector);
  }

  private get context(): GameContext {
    return {
      board: this.board,
      dictionary: Game.dictionary,
      inventory: this.inventory,
      turnDirector: this.turnDirector,
    };
  }

  get layoutCells(): ReadonlyArray<GameCell> {
    return this.board.cells;
  }

  get state(): GameState {
    return GameStateQuery.execute(this.context, this.isMutable);
  }

  get actionLog(): ReadonlyArray<Action> {
    return this.turnDirector.actionLog;
  }

  isCellInCenterOfLayout(cell: GameCell): boolean {
    return this.board.isCellCenter(cell);
  }

  getCellBonus(cell: GameCell): string | null {
    return this.board.getBonusForCell(cell);
  }

  findTileByCell(cell: GameCell): GameTile | undefined {
    return this.board.findTileByCell(cell);
  }

  findCellByTile(tile: GameTile): GameCell | undefined {
    return this.board.findCellByTile(tile);
  }

  isTilePlaced(tile: GameTile): boolean {
    return this.board.isTilePlaced(tile);
  }

  areTilesSame(firstTile: GameTile, secondTile: GameTile): boolean {
    return this.inventory.areTilesEqual(firstTile, secondTile);
  }

  getTileLetter(tile: GameTile): string {
    return this.inventory.getTileLetter(tile);
  }

  isCellLastConnectionInTurn(cell: GameCell): boolean {
    return this.turnDirector.currentTurnCellSequence?.at(-1) === cell;
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    const { previousTurnTileSequence } = this.turnDirector;
    if (!previousTurnTileSequence) return false;
    return previousTurnTileSequence.includes(tile);
  }

  drainEvents(): Array<DomainEvent> {
    return this.events.drain();
  }

  shuffleUserTiles(): void {
    this.ensureMutability();
    this.inventory.shuffleTilesFor(Player.User);
    this.events.raise(DomainEvent.TilesShuffled);
  }

  placeTile({ cell, tile }: { cell: GameCell; tile: GameTile }): void {
    this.ensureMutability();
    PlaceTileCommand.execute(this.context, { cell, tile });
    this.events.raise(DomainEvent.TilePlaced);
  }

  undoPlaceTile(tile: GameTile): void {
    this.ensureMutability();
    UndoPlaceTileCommand.execute(this.context, { tile });
    this.events.raise(DomainEvent.TileUndoPlaced);
  }

  resetTurn(): void {
    this.ensureMutability();
    this.turnDirector.resetCurrentTurn();
  }

  saveTurn(): { result: SaveTurnResult; opponentTurn?: Promise<SaveTurnResult> } {
    this.ensureMutability();
    const player = this.turnDirector.currentPlayer;
    const result = SaveTurnCommand.execute(this.context);
    if (!result.ok) return { result };
    this.events.raise(DomainEvent.TurnSaved);
    if (this.checkTileDepletion(player)) return { result };
    const opponentTurn = this.turnDirector.currentPlayer !== Player.User ? this.createOpponentTurn() : undefined;
    return { result, opponentTurn };
  }

  passTurn(): { opponentTurn?: Promise<SaveTurnResult> } {
    this.ensureMutability();
    PassTurnCommand.execute(this.context);
    this.events.raise(DomainEvent.TurnPassed);
    const opponentTurn = this.turnDirector.currentPlayer !== Player.User ? this.createOpponentTurn() : undefined;
    return { opponentTurn };
  }

  private async createOpponentTurn(): Promise<SaveTurnResult> {
    const generatedPlacementLinks = await this.setMinimumExecutionTime(() =>
      this.placementLinksGeneratorWorker.execute({ context: this.context, player: Player.Opponent }),
    );
    if (generatedPlacementLinks === null) {
      if (this.turnDirector.willPlayerPassBeResign(Player.User)) {
        ResignGameCommand.execute(this.context);
        this.endGame();
      } else {
        PassTurnCommand.execute(this.context);
        this.events.raise(DomainEvent.TurnPassed);
      }
      return { ok: true, value: { words: [] } };
    }
    const player = this.turnDirector.currentPlayer;
    for (const link of generatedPlacementLinks) this.turnDirector.placeTile({ cell: link.cell, tile: link.tile });
    const result = TurnValidator.execute(this.context, this.turnDirector.currentTurnPlacementLinks);
    this.turnDirector.setCurrentTurnValidation(result);
    const saveResult = SaveTurnCommand.execute(this.context);
    this.checkTileDepletion(player);
    this.events.raise(DomainEvent.OpponentTurnGenerated);
    return saveResult;
  }

  resignGame(): void {
    this.ensureMutability();
    ResignGameCommand.execute(this.context);
    this.endGame();
  }

  private checkTileDepletion(player: Player): boolean {
    if (this.inventory.hasTilesFor(player)) return false;
    this.turnDirector.endGameByTileDepletion(Object.values(Player));
    this.endGame();
    return true;
  }

  private endGame(): void {
    this.placementLinksGeneratorWorker.terminate();
    this.isMutable = false;
    const userAction = this.turnDirector.getLastActionFor(Player.User);
    const event = userAction && Game.ACTION_EVENTS[userAction.type];
    if (event) this.events.raise(event);
  }

  private async setMinimumExecutionTime<T>(callback: () => Promise<T> | T): Promise<T> {
    const startTime = Game.CLOCK.now();
    const result = await callback();
    const elapsed = Game.CLOCK.now() - startTime;
    const delay = Game.OPPONENT_RESPONSE_MIN_TIME - elapsed;
    if (delay > 0) await Game.CLOCK.wait(delay);
    return result;
  }

  private ensureMutability(): void {
    if (!this.isMutable) throw new Error('Game is immutable');
  }
}
