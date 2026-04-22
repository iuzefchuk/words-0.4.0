import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { AppConfig, AppDependencies, AppServices, GameDictionary, GameSettings } from '@/application/types/index.ts';
import { SchedulingService } from '@/application/types/ports.ts';
import { EventRepository } from '@/application/types/repositories.ts';
import Game from '@/domain/Game.ts';

export default class Application {
  get config(): AppConfig {
    return {
      boardCells: this.game.boardView.cells,
      boardCellsPerAxis: this.game.boardView.cellsPerAxis,
      tilesPerPlayer: this.game.inventoryView.tilesPerPlayer,
    };
  }

  get schedulingService(): SchedulingService {
    return this.dependencies.services.scheduling;
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

  static async create(dependencies: AppDependencies, settings: GameSettings): Promise<Application> {
    const { repositories, services, tasks } = dependencies;
    const game = await this.createGame(services, repositories.events, settings);
    const queriesService = new QueriesService(game);
    const commandsService = new CommandsService(
      game,
      services.scheduling,
      services.worker,
      tasks.turnGeneration,
      repositories.events,
      repositories.settings,
    );
    return new Application(game, dependencies, commandsService, queriesService);
  }

  private static async createGame(
    services: AppServices,
    eventRepository: EventRepository,
    settings: GameSettings,
  ): Promise<Game> {
    const events = await eventRepository.load();
    return events !== null && events.length > 0
      ? Game.createFromEvents(events, services.identity, services.seeding)
      : Game.create(services.identity, services.seeding, settings);
  }

  async loadDictionary(): Promise<void> {
    const { config, services, tasks } = this.dependencies;
    const buffer = await services.file.loadSharedArrayBuffer(config.dictionaryUrl);
    this.game.setDictionary(GameDictionary.createFromBuffer(buffer));
    await services.worker.init(tasks.turnGeneration, buffer);
  }
}
