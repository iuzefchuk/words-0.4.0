import Board from '@/domain/models/Board.ts';
import { CellIndex } from '@/domain/models/Board.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import Inventory, { TileId } from '@/domain/models/Inventory.ts';
import TurnDirector from '@/application/services/TurnDirector.ts';
import { ValidationError } from '@/domain/models/TurnTracker.ts';
import { GameResultType } from './enums.ts';
import { Player } from '@/domain/enums.ts';

export type GameContext = {
  board: Board;
  dictionary: Dictionary;
  inventory: Inventory;
  turnDirector: TurnDirector;
};

export type GameCell = CellIndex;

export type GameTile = TileId;

export type GameState = {
  isFinished: boolean;
  tilesRemaining: number;
  userTiles: ReadonlyArray<TileId>;
  currentTurnScore?: number;
  userScore: number;
  opponentScore: number;
  currentTurnIsValid: boolean;
  currentPlayerIsUser: boolean;
  userPassWillBeResign: boolean;
};

export type GameTurnResult = Result<{ words: ReadonlyArray<string> }, ValidationError>;

export type GameResult = { type: GameResultType; player: Player };
