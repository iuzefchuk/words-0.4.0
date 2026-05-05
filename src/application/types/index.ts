import { BootProgressPublisher, LoaderGateway, SchedulerGateway, WorkerGateway } from '@/application/types/ports.ts';
import { EventRepository, SettingsRepository } from '@/application/types/repositories.ts';
import { GameCell } from '@/domain/types/index.ts';
import { IdentifierGateway, RandomizerGateway } from '@/domain/types/ports.ts';

export {
  GameBonus,
  GameEventType,
  GameLetter,
  GameMatchDifficulty,
  GameMatchResult,
  GameMatchType,
  GamePlayer,
} from '@/domain/enums.ts';

export { GameDictionary, GameTurnGenerator } from '@/domain/types/index.ts';

export type {
  GameBoardView,
  GameCell,
  GameEvent,
  GameGeneratorContextData,
  GameGeneratorPartition,
  GameGeneratorResult,
  GameInventoryView,
  GameMatchSettings,
  GameMatchView,
  GameNode,
  GameTile,
  GameTurnsView,
} from '@/domain/types/index.ts';

export type AppConfig = {
  boardCells: ReadonlyArray<GameCell>;
  boardCellsPerAxis: number;
  tilesPerPlayer: number;
};

export type AppDependencies = {
  config: DependenciesConfig;
  repositories: { events: EventRepository; settings: SettingsRepository };
  services: AppServices;
  tasks: { turnGeneration: string };
};

export type AppServices = {
  // TODO move bootProgressPublisher & worker outside this type because they are not services
  bootProgressPublisher: BootProgressPublisher;
  identifier: IdentifierGateway;
  loader: LoaderGateway;
  randomizer: RandomizerGateway;
  scheduler: SchedulerGateway;
  worker: WorkerGateway;
};

export type AppTurnResponse = Result<{ words: ReadonlyArray<string> }, string>;

export type DependenciesConfig = {
  dictionaryUrl: string;
};
