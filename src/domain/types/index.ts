import { Difficulty, Letter, Player } from '@/domain/enums.ts';
import { BoardType, Bonus } from '@/domain/models/board/enums.ts';
import { type BoardView, type Cell } from '@/domain/models/board/types.ts';
import { default as GameDictionary } from '@/domain/models/dictionary/Dictionary.ts';
import { type Trie } from '@/domain/models/dictionary/types.ts';
import { EventType } from '@/domain/models/events/enums.ts';
import { type Event } from '@/domain/models/events/types.ts';
import { InventoryView, Tile } from '@/domain/models/inventory/types.ts';
import { MatchResult } from '@/domain/models/match/enums.ts';
import { MatchView } from '@/domain/models/match/types.ts';
import { TurnsView } from '@/domain/models/turns/types.ts';
import { default as GameTurnGenerator } from '@/domain/services/generation/turn/TurnGenerationService.ts';
import { GeneratorResult } from '@/domain/services/generation/turn/types.ts';

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
  Event as GameEvent,
  GeneratorResult as GameGeneratorResult,
  InventoryView as GameInventoryView,
  MatchView as GameMatchView,
  Tile as GameTile,
  Trie as GameTrie,
  TurnsView as GameTurnsView,
};

export type GameSettings = {
  boardType: BoardType;
  difficulty: Difficulty;
};
