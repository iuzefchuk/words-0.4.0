import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { AppConfig, GameDictionary, GameSettings } from '@/application/types.ts';
import Game from '@/domain/Game.ts';
import { DictionaryRepository, EventRepository, IdentityService, SeedingService } from '@/domain/types.ts';
import Infrastructure from '@/infrastructure/index.ts';

export default class Application {
  readonly commandsService: CommandsService;

  readonly queriesService: QueriesService;

  get config(): AppConfig {
    return {
      boardCells: this.game.boardView.cells,
      boardCellsPerAxis: this.game.boardView.cellsPerAxis,
      tilesPerPlayer: this.game.inventoryView.tilesPerPlayer,
    };
  }

  private constructor(
    commandsService: CommandsService,
    queriesService: QueriesService,
    private readonly game: Game,
  ) {
    this.commandsService = commandsService;
    this.queriesService = queriesService;
  }

  static async create(settings: GameSettings): Promise<Application> {
    const { repositories, services } = await Infrastructure.createAppDependencies();
    const game = await this.fetchGameInstance(services.identity, services.seeding, repositories, settings);
    const queriesService = new QueriesService(game);
    const commandsService = new CommandsService(game, services.identity, services.scheduling, repositories.events);
    return new Application(commandsService, queriesService, game);
  }

  private static async fetchDictionary(repository: DictionaryRepository): Promise<GameDictionary> {
    const snapshot = await repository.load();
    if (snapshot) return GameDictionary.restoreFromSnapshot(snapshot);
    const dictionary = await GameDictionary.create();
    repository.save(dictionary.snapshot);
    return dictionary;
  }

  private static async fetchGameInstance(
    identityService: IdentityService,
    seedingService: SeedingService,
    repositories: { dictionary: DictionaryRepository; events: EventRepository },
    settings: GameSettings,
  ): Promise<Game> {
    const dictionary = await this.fetchDictionary(repositories.dictionary);
    const events = await repositories.events.load();
    return events && events.length > 0
      ? Game.createFromEvents(events, dictionary, identityService, seedingService)
      : Game.create(identityService, seedingService, dictionary, settings);
  }
}
