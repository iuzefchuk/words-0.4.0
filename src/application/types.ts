import {
  GameBoardType,
  GameBonus,
  GameDictionary,
  GameDifficulty,
  GameEventType,
  GameLetter,
  GameMatchResult,
  GamePlayer,
  GameTurnGenerator,
} from '@/domain/types.ts';
import type {
  DictionaryRepository,
  EventRepository,
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchView,
  GameSettings,
  GameTile,
  GameTurnsView,
  IdentityService,
  SeedingService,
} from '@/domain/types.ts';

export type AppConfig = {
  boardCells: ReadonlyArray<GameCell>;
  boardCellsPerAxis: number;
  tilesPerPlayer: number;
};

export type AppDependencies = {
  repositories: {
    dictionary: DictionaryRepository;
    events: EventRepository;
  };
  services: {
    compression: CompressionService;
    identity: IdentityService;
    scheduling: SchedulingService;
    seeding: SeedingService;
  };
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;

export type CompressionService = {
  fetchAndDecompress(url: string): Promise<string>;
};

export type SchedulingService = {
  getCurrentTime(): number;
  wait(ms: number): Promise<void>;
  yield(): Promise<void>;
};

export type { GameBoardView, GameCell, GameEvent, GameGeneratorResult, GameInventoryView, GameMatchView, GameSettings, GameTile, GameTurnsView };

export { GameBoardType, GameBonus, GameDictionary, GameDifficulty, GameEventType, GameLetter, GameMatchResult, GamePlayer, GameTurnGenerator };
