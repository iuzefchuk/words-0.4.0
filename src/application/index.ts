import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { AppConfig, GameDictionary, GameSettings } from '@/application/types/index.ts';
import { FileService, IdentityService, SchedulingService, SeedingService, WorkerService } from '@/application/types/ports.ts';
import { EventRepository } from '@/application/types/repositories.ts';
import Game from '@/domain/Game.ts';
import Infrastructure from '@/infrastructure/index.ts';

export default class Application {
  get config(): AppConfig {
    return {
      boardCells: this.game.boardView.cells,
      boardCellsPerAxis: this.game.boardView.cellsPerAxis,
      tilesPerPlayer: this.game.inventoryView.tilesPerPlayer,
    };
  }

  private constructor(
    private readonly game: Game,
    readonly schedulingService: SchedulingService,
    private readonly fileService: FileService,
    private readonly workerService: WorkerService,
    private readonly turnGenerationTaskId: string,
    readonly commandsService: CommandsService,
    readonly queriesService: QueriesService,
  ) {
    this.commandsService = commandsService;
    this.queriesService = queriesService;
  }

  static async create(settings: GameSettings): Promise<Application> {
    const { repositories, services, tasks } = await Infrastructure.createAppDependencies();
    const game = await this.createGame(services, repositories, settings);
    const queriesService = new QueriesService(game);
    const commandsService = new CommandsService(
      game,
      services.scheduling,
      services.worker,
      tasks.turnGeneration,
      repositories.events,
    );
    return new Application(
      game,
      services.scheduling,
      services.file,
      services.worker,
      tasks.turnGeneration,
      commandsService,
      queriesService,
    );
  }

  private static async createGame(
    services: { identity: IdentityService; seeding: SeedingService },
    repositories: { events: EventRepository },
    settings: GameSettings,
  ): Promise<Game> {
    const events = await repositories.events.load();
    return events !== null && events.length > 0
      ? Game.createFromEvents(events, services.identity, services.seeding)
      : Game.create(services.identity, services.seeding, settings);
  }

  async loadDictionary(): Promise<void> {
    const buffer = await this.fileService.loadSharedArrayBuffer('/dictionary.bin');
    this.game.setDictionary(GameDictionary.createFromBuffer(buffer));
    await this.workerService.init(this.turnGenerationTaskId, buffer);
  }
}
