import { EventType as GameEventType, Letter as GameLetter, Player as GamePlayer } from '@/domain/enums.ts';
import type { default as Game } from '@/domain/index.ts';
import { Bonus as GameBonus } from '@/domain/models/Board.ts';
import type { BoardView as GameBoardView, CellIndex as GameCell } from '@/domain/models/Board.ts';
import { default as GameDictionary } from '@/domain/models/Dictionary.ts';
import type { DictionaryProps as GameDictionaryProps } from '@/domain/models/Dictionary.ts';
import type { InventoryView as GameInventoryView, TileId as GameTile } from '@/domain/models/Inventory.ts';
import { MatchResult as GameMatchResult } from '@/domain/models/MatchTracker.ts';
import type { MatchView as GameMatchView } from '@/domain/models/MatchTracker.ts';
import type { TurnView as GameTurnView } from '@/domain/models/TurnTracker.ts';
import type {
  GeneratorContext as GameGeneratorContext,
  GeneratorResult as GameGeneratorResult,
} from '@/domain/services/TurnGenerator.ts';
import { default as GameTurnGenerator } from '@/domain/services/TurnGenerator.ts';

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

export type {
  Game,
  GameCell,
  GameBoardView,
  GameDictionaryProps,
  GameTile,
  GameInventoryView,
  GameTurnView,
  GameGeneratorContext,
  GameGeneratorResult,
};
export {
  GamePlayer,
  GameEventType,
  GameLetter,
  GameBonus,
  GameDictionary,
  GameMatchResult,
  GameMatchView,
  GameTurnGenerator,
};
