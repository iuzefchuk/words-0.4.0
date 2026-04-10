import { Difficulty, EventType, Letter, Player } from '@/domain/enums.ts';
import { BoardType, Bonus } from '@/domain/models/board/enums.ts';
import { type BoardView, type Cell } from '@/domain/models/board/types.ts';
import { default as GameDictionary } from '@/domain/models/dictionary/Dictionary.ts';
import { type Trie } from '@/domain/models/dictionary/types.ts';
import { InventoryView, Tile } from '@/domain/models/inventory/types.ts';
import { MatchResult } from '@/domain/models/match/enums.ts';
import { MatchView } from '@/domain/models/match/types.ts';
import { TurnsView, ValidationResult } from '@/domain/models/turns/types.ts';
import { default as GameTurnGenerator, GeneratorResult } from '@/domain/services/turn-generation/TurnGenerationService.ts';

export {
  BoardType as GameBoardType,
  Bonus as GameBonus,
  GameDictionary,
  Difficulty as GameDifficulty,
  EventType as GameEventType,
  Letter as GameLetter,
  MatchResult as GameMatchResult,
  Player as GamePlayer,
  GameTurnGenerator,
};

export type {
  BoardView as GameBoardView,
  Cell as GameCell,
  GeneratorResult as GameGeneratorResult,
  InventoryView as GameInventoryView,
  MatchView as GameMatchView,
  Tile as GameTile,
  Trie as GameTrie,
  TurnsView as GameTurnsView,
};

export type GameEvent =
  | { boardType: BoardType; seed: number; type: EventType.BoardTypeChanged }
  | { cell: Cell; tile: Tile; type: EventType.TilePlaced }
  | { cell: Cell; tile: Tile; type: EventType.TileUndoPlaced }
  | { difficulty: Difficulty; type: EventType.DifficultyChanged }
  | { player: Player; score: number; type: EventType.TurnSaved; words: ReadonlyArray<string> }
  | { player: Player; type: EventType.TurnPassed }
  | { result: ValidationResult; type: EventType.TurnValidated }
  | { seed: number; settings: GameSettings; type: EventType.MatchStarted }
  | { type: EventType.MatchFinished; winner: null | Player };

export type GameSettings = {
  boardType: BoardType;
  difficulty: Difficulty;
};
