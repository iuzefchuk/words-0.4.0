import { Letter, Player } from '@/domain/enums.ts';
import { Bonus } from '@/domain/models/board/enums.ts';
import { type BoardView, type Cell } from '@/domain/models/board/types.ts';
import { default as GameDictionary } from '@/domain/models/dictionary/Dictionary.ts';
import { type Node } from '@/domain/models/dictionary/types.ts';
import { EventType } from '@/domain/models/events/enums.ts';
import { type Event } from '@/domain/models/events/types.ts';
import { InventoryView, Tile } from '@/domain/models/inventory/types.ts';
import { Difficulty, MatchResult, MatchType } from '@/domain/models/match/enums.ts';
import { MatchSettings, MatchView } from '@/domain/models/match/types.ts';
import { TurnsView } from '@/domain/models/turns/types.ts';
import { default as GameTurnGenerator } from '@/domain/services/generation/turn/TurnGenerationService.ts';
import { GeneratorContextData, GeneratorPartition, GeneratorResult } from '@/domain/services/generation/turn/types.ts';

export {
  Bonus as GameBonus,
  GameDictionary,
  Difficulty as GameDifficulty,
  EventType as GameEventType,
  Letter as GameLetter,
  MatchResult as GameMatchResult,
  MatchType as GameMatchType,
  Player as GamePlayer,
  GameTurnGenerator,
};

export type {
  BoardView as GameBoardView,
  Cell as GameCell,
  Event as GameEvent,
  GeneratorContextData as GameGeneratorContextData,
  GeneratorPartition as GameGeneratorPartition,
  GeneratorResult as GameGeneratorResult,
  InventoryView as GameInventoryView,
  MatchView as GameMatchView,
  Node as GameNode,
  MatchSettings as GameSettings,
  Tile as GameTile,
  TurnsView as GameTurnsView,
};
