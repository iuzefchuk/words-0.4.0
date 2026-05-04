import { BootProgress } from '@/application/enums.ts';
import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import {
  AppConfig,
  AppDependencies,
  AppServices,
  GameDictionary,
  GameEvent,
  GameMatchSettings,
} from '@/application/types/index.ts';
import { SchedulerService } from '@/application/types/ports.ts';
import Game from '@/domain/Game.ts';

export default class Application {
  get config(): AppConfig {
    return {
      boardCells: this.game.boardView.cells,
      boardCellsPerAxis: this.game.boardView.cellsPerAxis,
      tilesPerPlayer: this.game.inventoryView.tilesPerPlayer,
    };
  }

  get scheduler(): SchedulerService {
    return this.dependencies.services.scheduler;
  }

  private constructor(
    private readonly game: Game,
    private readonly dependencies: AppDependencies,
    readonly commandsService: CommandsService,
    readonly queriesService: QueriesService,
  ) {
    this.commandsService = commandsService;
    this.queriesService = queriesService;
  }

  static async create(dependencies: AppDependencies, settings: GameMatchSettings): Promise<Application> {
    const { repositories, services, tasks } = dependencies;
    const events = await repositories.events.load();
    const game = this.createGameInstance(services, events, settings);
    const queriesService = new QueriesService(game);
    const commandsService = new CommandsService(
      game,
      services.scheduler,
      services.worker,
      tasks.turnGeneration,
      repositories.events,
      repositories.settings,
    );
    return new Application(game, dependencies, commandsService, queriesService);
  }

  private static createGameInstance(
    services: AppServices,
    events: null | ReadonlyArray<GameEvent>,
    settings: GameMatchSettings,
  ): Game {
    return events !== null && events.length > 0
      ? Game.createFromEvents(events, services.identifier, services.randomizer)
      : Game.create(services.identifier, services.randomizer, settings);
  }

  async bootDictionary(): Promise<void> {
    const { config, services, tasks } = this.dependencies;
    services.bootObserver.notify(BootProgress.Initialized);
    const buffer = await services.loader.load(config.dictionaryUrl);
    services.bootObserver.notify(BootProgress.DictionaryFetched);
    this.game.setDictionary(GameDictionary.createFromBuffer(buffer));
    services.bootObserver.notify(BootProgress.DictionaryParsed);
    await services.worker.init(tasks.turnGeneration, buffer);
    services.bootObserver.notify(BootProgress.Done);
  }
}
