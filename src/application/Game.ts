import Board, { Bonus } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import { Letter, Player } from '@/domain/enums.ts';
import { DomainEvent, EventCollector } from '@/domain/events.ts';
import { TurnOutcome, TurnOutcomeType } from '@/domain/models/TurnTracker.ts';
import Inventory from '@/domain/models/Inventory.ts';
import { TIME } from '@/shared/constants.ts';
import { GameContext, GameCell, GameTile, GameState, GameTurnResult, GameResult } from '@/application/types.ts';
import { GameResultType } from '@/application/enums.ts';
import GameStateQuery from '@/application/queries/GameState.ts';
import TurnDirector from '@/application/services/TurnDirector.ts';
import PlaceTileCommand from '@/application/commands/PlaceTile.ts';
import SaveTurnCommand from '@/application/commands/SaveTurn.ts';
import UndoPlaceTileCommand from '@/application/commands/UndoPlaceTile.ts';
import OpponentTurnCreator from '@/application/services/OpponentTurnCreator.ts';
import TurnGeneratorWorker from '@/infrastructure/TurnGeneratorWorker/index.ts';
import IndexedDbDictionaryFactory from '@/infrastructure/IndexedDbDictionaryFactory.ts';
import IdGenerator from '@/infrastructure/CryptoIdGenerator.ts';
import Clock from '@/infrastructure/DateApiClock.ts';

export default class Game {
  static readonly BONUSES = Bonus;
  static readonly LETTERS = Letter;
  private static readonly RESULT_EVENTS: Partial<Record<GameResultType, DomainEvent>> = {
    [GameResultType.Win]: DomainEvent.GameWon,
    [GameResultType.Lose]: DomainEvent.GameLost,
    [GameResultType.Tie]: DomainEvent.GameTied,
  };
  private static readonly OPPONENT_RESPONSE_MIN_TIME = TIME.ms_in_second * 2;
  private static readonly CLOCK = new Clock();
  private static dictionary: Dictionary;
  private readonly turnGeneratorWorker = new TurnGeneratorWorker();
  private readonly events = new EventCollector();
  private readonly resultLog: Array<GameResult> = [];
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

  get layoutCells(): ReadonlyArray<GameCell> {
    return this.board.cells;
  }

  get state(): GameState {
    return GameStateQuery.execute(this.context, this.isMutable);
  }

  get outcomeHistory(): ReadonlyArray<TurnOutcome> {
    return this.turnDirector.outcomeHistory;
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
    return this.turnDirector.currentTurnCells?.at(-1) === cell;
  }

  wasTileUsedInPreviousTurn(tile: GameTile): boolean {
    const { previousTurnTiles } = this.turnDirector;
    if (!previousTurnTiles) return false;
    return previousTurnTiles.includes(tile);
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

  saveTurn(): { result: GameTurnResult; opponentTurn?: Promise<GameTurnResult> } {
    this.ensureMutability();
    const player = this.turnDirector.currentPlayer;
    const result = SaveTurnCommand.execute(this.context);
    if (!result.ok) return { result };
    this.events.raise(DomainEvent.TurnSaved);
    if (this.checkTileDepletion(player)) return { result };
    const opponentTurn = this.turnDirector.currentPlayer !== Player.User ? this.createOpponentTurn() : undefined;
    return { result, opponentTurn };
  }

  passTurn(): { opponentTurn?: Promise<GameTurnResult> } {
    this.ensureMutability();
    this.turnDirector.passCurrentTurn();
    this.events.raise(DomainEvent.TurnPassed);
    const opponentTurn = this.turnDirector.currentPlayer !== Player.User ? this.createOpponentTurn() : undefined;
    return { opponentTurn };
  }

  resignGame(): void {
    this.ensureMutability();
    this.recordResign();
    this.endGame();
  }

  drainEvents(): Array<DomainEvent> {
    return this.events.drain();
  }

  private get context(): GameContext {
    return {
      board: this.board,
      dictionary: Game.dictionary,
      inventory: this.inventory,
      turnDirector: this.turnDirector,
    };
  }

  private getGameResultFor(player: Player): GameResult | undefined {
    for (let i = this.resultLog.length - 1; i >= 0; i--) {
      if (this.resultLog[i].player === player) return this.resultLog[i];
    }
    return undefined;
  }

  private recordResign(): void {
    const loser = this.turnDirector.currentPlayer;
    const winner = this.turnDirector.nextPlayer;
    this.resultLog.push({ type: GameResultType.Lose, player: loser });
    this.resultLog.push({ type: GameResultType.Win, player: winner });
  }

  private async createOpponentTurn(): Promise<GameTurnResult> {
    const outcome = await this.setMinimumExecutionTime(() =>
      OpponentTurnCreator.execute(this.context, this.turnGeneratorWorker),
    );
    switch (outcome.type) {
      case TurnOutcomeType.Resign:
        this.recordResign();
        this.endGame();
        return { ok: true, value: { words: [] } };
      case TurnOutcomeType.Pass:
        this.events.raise(DomainEvent.TurnPassed);
        return { ok: true, value: { words: [] } };
      case TurnOutcomeType.Save:
        this.checkTileDepletion(Player.Opponent);
        this.events.raise(DomainEvent.OpponentTurnGenerated);
        return outcome.result;
    }
  }

  private checkTileDepletion(player: Player): boolean {
    if (this.inventory.hasTilesFor(player)) return false;
    const players = Object.values(Player);
    const scores = players.map(p => ({ player: p, score: this.turnDirector.getScoreFor(p) }));
    const maxScore = Math.max(...scores.map(s => s.score));
    const allTied = scores.every(s => s.score === maxScore);
    if (allTied) {
      for (const { player } of scores) this.resultLog.push({ type: GameResultType.Tie, player });
    } else {
      for (const { player, score } of scores) {
        this.resultLog.push({ type: score === maxScore ? GameResultType.Win : GameResultType.Lose, player });
      }
    }
    this.endGame();
    return true;
  }

  private endGame(): void {
    this.turnGeneratorWorker.terminate();
    this.isMutable = false;
    const userGameResult = this.getGameResultFor(Player.User);
    const event = userGameResult && Game.RESULT_EVENTS[userGameResult.type];
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
