import { EventType as GameEventType, Letter as GameLetter, Player as GamePlayer } from '@/domain/enums.ts';
import { Bonus as GameBonus } from '@/domain/models/Board.ts';
import type { BoardSnapshot, BoardView as GameBoardView, CellIndex as GameCell } from '@/domain/models/Board.ts';
import type {
  InventoryView as GameInventoryView,
  TileId as GameTile,
  InventorySnapshot,
} from '@/domain/models/Inventory.ts';
import { MatchResult as GameMatchResult } from '@/domain/models/Match.ts';
import type { MatchView as GameMatchView, MatchSnapshot } from '@/domain/models/Match.ts';
import type { TurnsView as GameTurnsView, TurnsSnapshot } from '@/domain/models/Turns.ts';
import { default as GameTurnGenerator } from '@/domain/services/TurnGenerator.ts';

export type EventsSnapshot = {
  readonly log: Array<GameEvent>;
};

export type GameSnapshot = {
  version: number;
  board: BoardSnapshot;
  inventory: InventorySnapshot;
  match: MatchSnapshot;
  turns: TurnsSnapshot;
  events: EventsSnapshot;
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

export type { GameCell, GameBoardView, GameTile, GameInventoryView, GameTurnsView };
export { GamePlayer, GameEventType, GameLetter, GameBonus, GameMatchResult, GameMatchView, GameTurnGenerator };
