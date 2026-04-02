import { Difficulty as GameDifficulty, EventType as GameEventType, Letter as GameLetter, Player as GamePlayer } from '@/domain/enums.ts';
import { Bonus as GameBonus, BonusDistribution as GameBonusDistribution } from '@/domain/models/Board.ts';
import { default as GameDictionary } from '@/domain/models/Dictionary.ts';
import { MatchResult as GameMatchResult } from '@/domain/models/Match.ts';
import { type GeneratorResult as GameGeneratorResult, default as GameTurnGenerator } from '@/domain/services/TurnGenerator.ts';
import type { BoardSnapshot, BoardView as GameBoardView, CellIndex as GameCell } from '@/domain/models/Board.ts';
import type { InventoryView as GameInventoryView, TileId as GameTile, InventorySnapshot } from '@/domain/models/Inventory.ts';
import type { MatchView as GameMatchView, MatchSnapshot } from '@/domain/models/Match.ts';
import type { TurnsView as GameTurnsView, TurnsSnapshot } from '@/domain/models/Turns.ts';

export type EventsSnapshot = {
  readonly log: Array<GameEvent>;
};

export type GameEvent =
  | { score: number; type: GameEventType.OpponentTurnSaved; words: ReadonlyArray<string> }
  | { score: number; type: GameEventType.UserTurnSaved; words: ReadonlyArray<string> }
  | { type: GameEventType.MatchLost }
  | { type: GameEventType.MatchTied }
  | { type: GameEventType.MatchWon }
  | { type: GameEventType.OpponentTurnPassed }
  | { type: GameEventType.TilePlaced }
  | { type: GameEventType.TileUndoPlaced }
  | { type: GameEventType.UserTurnPassed };

export type GameSettings = {
  bonusDistribution: GameBonusDistribution;
  difficulty: GameDifficulty;
};

export type GameSnapshot = {
  board: BoardSnapshot;
  difficulty: GameDifficulty;
  events: EventsSnapshot;
  inventory: InventorySnapshot;
  match: MatchSnapshot;
  turns: TurnsSnapshot;
  version: string;
};

export type { GameBoardView, GameCell, GameGeneratorResult, GameInventoryView, GameMatchView, GameTile, GameTurnsView };
export {
  GameBonus,
  GameBonusDistribution,
  GameDictionary,
  GameDifficulty,
  GameEventType,
  GameLetter,
  GameMatchResult,
  GamePlayer,
  GameTurnGenerator,
};
