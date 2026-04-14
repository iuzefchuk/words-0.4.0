import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { AppConfig, GameDictionary, GameSerializedNode, GameSettings } from '@/application/types/index.ts';
import {
  CompressionService,
  IdentityService,
  SchedulingService,
  SeedingService,
  WorkerService,
} from '@/application/types/ports.ts';
import { DictionaryRepository, EventRepository } from '@/application/types/repositories.ts';
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
    private readonly compressor: CompressionService,
    private readonly schedulingService: SchedulingService,
    private readonly workerService: WorkerService,
    private readonly dictionaryTaskId: string,
    private readonly dictionaryRepository: DictionaryRepository,
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
      services.compression,
      services.scheduling,
      services.worker,
      tasks.dictionary,
      repositories.dictionary,
      commandsService,
      queriesService,
    );
  }

  private static async createGame(
    services: { compression: CompressionService; identity: IdentityService; seeding: SeedingService },
    repositories: { dictionary: DictionaryRepository; events: EventRepository },
    settings: GameSettings,
  ): Promise<Game> {
    const events = await repositories.events.load();
    return events && events.length > 0
      ? Game.createFromEvents(events, services.identity, services.seeding)
      : Game.create(services.identity, services.seeding, settings);
  }

  async loadDictionary(): Promise<void> {
    let data = await this.dictionaryRepository.load();
    if (typeof data !== 'string') {
      data = await this.compressor.fetchAndDecompress('/dictionary.gz');
      this.dictionaryRepository.save(data);
    }
    const array = await this.workerService.execute<GameSerializedNode>(this.dictionaryTaskId, data);
    const trie = await GameDictionary.createNodeTree(array, () => this.schedulingService.yield());
    this.game.setDictionary(GameDictionary.createFromTrie(trie));
  }
}
