import {
  Difficulty as GameDifficulty,
  EventType as GameEventType,
  Letter as GameLetter,
  Player as GamePlayer,
} from '@/domain/enums.ts';
import { Bonus as GameBonus, BonusDistribution as GameBonusDistribution } from '@/domain/models/Board.ts';
import type { BoardSnapshot, BoardView as GameBoardView, CellIndex as GameCell } from '@/domain/models/Board.ts';
import { default as GameDictionary } from '@/domain/models/Dictionary.ts';
import type {
  InventoryView as GameInventoryView,
  TileId as GameTile,
  InventorySnapshot,
} from '@/domain/models/Inventory.ts';
import { MatchResult as GameMatchResult } from '@/domain/models/Match.ts';
import type { MatchView as GameMatchView, MatchSnapshot } from '@/domain/models/Match.ts';
import type { TurnsView as GameTurnsView, TurnsSnapshot } from '@/domain/models/Turns.ts';
import {
  type GeneratorResult as GameGeneratorResult,
  default as GameTurnGenerator,
} from '@/domain/services/TurnGenerator.ts';

export type EventsSnapshot = {
  readonly log: Array<GameEvent>;
};

export type GameSettings = {
  bonusDistribution: GameBonusDistribution;
  difficulty: GameDifficulty;
};

export type GameSnapshot = {
  version: string;
  difficulty: GameDifficulty;
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

export type { GameCell, GameBoardView, GameTile, GameInventoryView, GameTurnsView, GameMatchView, GameGeneratorResult };
export {
  GamePlayer,
  GameEventType,
  GameDifficulty,
  GameLetter,
  GameBonus,
  GameBonusDistribution,
  GameMatchResult,
  GameTurnGenerator,
  GameDictionary,
};
