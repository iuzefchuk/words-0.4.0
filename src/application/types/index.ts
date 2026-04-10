import { CompressionService, SchedulingService } from '@/application/types/ports.ts';
import { DictionaryRepository, EventRepository } from '@/application/types/repositories.ts';
import { GameCell } from '@/domain/types/index.ts';
import { IdentityService, SeedingService } from '@/domain/types/ports.ts';

export {
  GameBoardType,
  GameBonus,
  GameDictionary,
  GameDifficulty,
  GameEventType,
  GameLetter,
  GameMatchResult,
  GamePlayer,
  GameTurnGenerator,
} from '@/domain/types/index.ts';

export type {
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchView,
  GameSettings,
  GameTile,
  GameTrie,
  GameTurnsView,
} from '@/domain/types/index.ts';

export type AppConfig = {
  boardCells: ReadonlyArray<GameCell>;
  boardCellsPerAxis: number;
  tilesPerPlayer: number;
};

export type AppDependencies = {
  repositories: { dictionary: DictionaryRepository; events: EventRepository };
  services: { compression: CompressionService; identity: IdentityService; scheduling: SchedulingService; seeding: SeedingService };
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;
