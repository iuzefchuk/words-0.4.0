import { Difficulty as GameDifficulty, EventType as GameEventType, Letter as GameLetter, Player as GamePlayer } from '@/domain/enums.ts';
import { Bonus as GameBonus, BoardType as GameBonusDistribution } from '@/domain/models/board/enums.ts';
import { default as GameDictionary } from '@/domain/models/dictionary/Dictionary.ts';
import { DictionarySnapshot } from '@/domain/models/dictionary/types.ts';
import { MatchResult as GameMatchResult } from '@/domain/models/match/enums.ts';
import {
  type GeneratorResult as GameGeneratorResult,
  default as GameTurnGenerator,
} from '@/domain/services/turn-generation/TurnGenerationService.ts';
import type { BoardView as GameBoardView, Cell as GameCell } from '@/domain/models/board/types.ts';
import type { InventoryView as GameInventoryView, Tile as GameTile } from '@/domain/models/inventory/types.ts';
import type { MatchView as GameMatchView } from '@/domain/models/match/types.ts';
import type { TurnsView as GameTurnsView, ValidationResult } from '@/domain/models/turns/types.ts';

export type DictionaryRepository = {
  load(): Promise<DictionarySnapshot | null>;
  save(snapshot: DictionarySnapshot): Promise<void>;
};

export type EventRepository = {
  delete(): Promise<void>;
  load(): Promise<null | ReadonlyArray<GameEvent>>;
  save(events: ReadonlyArray<GameEvent>): Promise<void>;
};

export type GameEvent =
  | { cell: GameCell; tile: GameTile; type: GameEventType.TilePlaced }
  | { cell: GameCell; tile: GameTile; type: GameEventType.TileUndoPlaced }
  | { player: GamePlayer; score: number; type: GameEventType.TurnSaved; words: ReadonlyArray<string> }
  | { player: GamePlayer; type: GameEventType.TurnPassed }
  | { result: ValidationResult; type: GameEventType.TurnValidated }
  | { seed: number; settings: GameSettings; type: GameEventType.MatchStarted }
  | { type: GameEventType.MatchFinished; winner: GamePlayer | null };

export type GameSettings = {
  boardType: GameBonusDistribution;
  difficulty: GameDifficulty;
};

export type IdentityService = {
  createUniqueId(): string;
};

export type SeedingService = {
  createRandomizer(seed: number): () => number;
  createSeed(): number;
};

export type { GameBoardView, GameCell, GameGeneratorResult, GameInventoryView, GameMatchView, GameTile, GameTurnsView, ValidationResult };

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
