import AppCommandBuilder from '@/application/commands.ts';
import AppQueryBuilder from '@/application/queries.ts';
import { AppCommands, AppConfig, AppQueries, GameDictionary, GameSettings } from '@/application/types.ts';
import Game from '@/domain/index.ts';
import { DictionaryRepository, GameRepository, IdGenerator } from '@/domain/ports.ts';
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
    const { clock, idGenerator, repositories, scheduler, versionProvider } =
      await Infrastructure.createAppDependencies();
    const version = versionProvider.version;
    const game = await this.fetchGameInstance(version, idGenerator, repositories, settings);
    const queryBuilder = new AppQueryBuilder(game);
    const commandBuilder = new AppCommandBuilder(game, clock, scheduler, repositories.game);
    return new Application(queryBuilder, commandBuilder, game);
  }

  private static async fetchDictionary(repository: DictionaryRepository): Promise<GameDictionary> {
    const snapshot = await repository.load();
    if (snapshot) return GameDictionary.restoreFromSnapshot(snapshot);
    const dictionary = GameDictionary.create();
    repository.save(dictionary.snapshot);
    return dictionary;
  }

  private static async fetchGameInstance(
    version: string,
    idGenerator: IdGenerator,
    repositories: { dictionary: DictionaryRepository; game: GameRepository },
    settings: GameSettings,
  ): Promise<Game> {
    const dictionary = await this.fetchDictionary(repositories.dictionary);
    const snapshot = await repositories.game.load();
    if (snapshot) {
      const restoredGame = Game.restoreFromSnapshot(version, snapshot, idGenerator, dictionary);
      if (restoredGame) return restoredGame;
    }
    return Game.create(version, idGenerator, dictionary, settings);
  }
}
