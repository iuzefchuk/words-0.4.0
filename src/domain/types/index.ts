import { default as GameDictionary } from '@/domain/models/dictionary/Dictionary.ts';
import { default as GameTurnGenerator } from '@/domain/services/generation/turn/TurnGenerationService.ts';
import type { Event } from '@/domain/events/types.ts';
import type { AnchorCoordinates, BoardView, Cell, Link, Placement } from '@/domain/models/board/types.ts';
import type { Node } from '@/domain/models/dictionary/types.ts';
import type { InventoryView, Tile, TileCollection } from '@/domain/models/inventory/types.ts';
import type { MatchSettings, MatchView } from '@/domain/models/match/types.ts';
import type {
  ComputedCells,
  ComputedPlacements,
  ComputedScore,
  ComputedValue,
  ComputedWords,
  InvalidResult,
  TurnsView,
  ValidationResult,
  ValidResult,
} from '@/domain/models/turns/types.ts';
import type {
  GeneratorContext,
  GeneratorContextData,
  GeneratorPartition,
  GeneratorResult,
} from '@/domain/services/generation/turn/types.ts';

export { GameDictionary, GameTurnGenerator };

export type {
  AnchorCoordinates as GameAnchorCoordinates,
  BoardView as GameBoardView,
  Cell as GameCell,
  ComputedCells as GameComputedCells,
  ComputedPlacements as GameComputedPlacements,
  ComputedScore as GameComputedScore,
  ComputedValue as GameComputedValue,
  ComputedWords as GameComputedWords,
  Event as GameEvent,
  GeneratorContext as GameGeneratorContext,
  GeneratorContextData as GameGeneratorContextData,
  GeneratorPartition as GameGeneratorPartition,
  GeneratorResult as GameGeneratorResult,
  InvalidResult as GameInvalidResult,
  InventoryView as GameInventoryView,
  Link as GameLink,
  MatchSettings as GameMatchSettings,
  MatchView as GameMatchView,
  Node as GameNode,
  Placement as GamePlacement,
  Tile as GameTile,
  TileCollection as GameTileCollection,
  TurnsView as GameTurnsView,
  ValidationResult as GameValidationResult,
  ValidResult as GameValidResult,
};
