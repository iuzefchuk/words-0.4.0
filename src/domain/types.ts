import { EventType as GameEventType, Letter as GameLetter, Player as GamePlayer } from '@/domain/enums.ts';
import type { default as Game } from '@/domain/index.ts';
import { Bonus as GameBonus } from '@/domain/models/Board.ts';
import type { BoardSnapshot, BoardView as GameBoardView, CellIndex as GameCell } from '@/domain/models/Board.ts';
import type { DictionarySnapshot } from '@/domain/models/Dictionary.ts';
import type {
  InventoryView as GameInventoryView,
  TileId as GameTile,
  InventorySnapshot,
} from '@/domain/models/Inventory.ts';
import { MatchResult as GameMatchResult } from '@/domain/models/MatchTracker.ts';
import type { MatchView as GameMatchView, MatchTrackerSnapshot } from '@/domain/models/MatchTracker.ts';
import type { TurnView as GameTurnView, TurnTrackerSnapshot } from '@/domain/models/TurnTracker.ts';
import { default as GameTurnGenerator } from '@/domain/services/TurnGenerator.ts';

export type GameSnapshot = {
  version: number;
  board: BoardSnapshot;
  dictionary: DictionarySnapshot;
  inventory: InventorySnapshot;
  matchTracker: MatchTrackerSnapshot;
  turnTracker: TurnTrackerSnapshot;
};

export type GameEvent =
  | { type: GameEventType.TilePlaced }
  | { type: GameEventType.TileUndoPlaced }
  | { type: GameEventType.UserTurnSaved; words: ReadonlyArray<string>; score: number }
  | { type: GameEventType.UserTurnPassed }
  | { type: GameEventType.OpponentTurnSaved; words: ReadonlyArray<string>; score: number }
  | { type: GameEventType.OpponentTurnPassed }
  | { type: GameEventType.MatchWon }
  | { type: GameEventType.MatchTied }
  | { type: GameEventType.MatchLost };

export type { Game, GameCell, GameBoardView, GameTile, GameInventoryView, GameTurnView };
export { GamePlayer, GameEventType, GameLetter, GameBonus, GameMatchResult, GameMatchView, GameTurnGenerator };
