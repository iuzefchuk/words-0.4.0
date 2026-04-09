import AppCommandBuilder from '@/application/commands.ts';
import AppQueryBuilder from '@/application/queries.ts';
import { AppCommands, AppConfig, AppQueries, GameDictionary, GameSettings } from '@/application/types.ts';
import Game from '@/domain/Game.ts';
import { DictionaryRepository, EventRepository, IdentityService, SeedingService } from '@/domain/types.ts';
import Infrastructure from '@/infrastructure/index.ts';

export default class Application {
  get commands(): AppCommands {
    return this.commandBuilder.commands;
  }

  get config(): AppConfig {
    return {
      boardCells: this.game.boardView.cells,
      boardCellsPerAxis: this.game.boardView.cellsPerAxis,
    };
  }

  get queries(): AppQueries {
    return this.queryBuilder.queries;
  }

  private constructor(
    private readonly queryBuilder: AppQueryBuilder,
    private readonly commandBuilder: AppCommandBuilder,
    private readonly game: Game,
  ) {}

  static async create(settings: GameSettings): Promise<Application> {
    const { repositories, services } = await Infrastructure.createAppDependencies();
    const game = await this.fetchGameInstance(services.identity, services.seeding, repositories, settings);
    const queryBuilder = new AppQueryBuilder(game);
    const commandBuilder = new AppCommandBuilder(game, services.identity, services.scheduling, repositories.events);
    return new Application(queryBuilder, commandBuilder, game);
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
