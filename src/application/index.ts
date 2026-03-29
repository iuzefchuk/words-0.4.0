import AppCommandBuilder from '@/application/commands.ts';
import AppQueryBuilder from '@/application/queries.ts';
import { AppCommands, AppConfig, AppQueries } from '@/application/types.ts';
import Game from '@/domain/index.ts';
import { GameRepository } from '@/domain/ports.ts';
import { IdGenerator } from '@/domain/ports.ts';
import Infrastructure from '@/infrastructure/index.ts';

export default class Application {
  private constructor(
    private readonly queryBuilder: AppQueryBuilder,
    private readonly commandBuilder: AppCommandBuilder,
    private readonly game: Game,
  ) {}

  static async create(): Promise<Application> {
    const { idGenerator, clock, scheduler, gameRepository } = await Infrastructure.createAppDependencies();
    const game = await this.createGameInstance(gameRepository, idGenerator);
    const queryBuilder = new AppQueryBuilder(game);
    const commandBuilder = new AppCommandBuilder(game, clock, scheduler, gameRepository);
    return new Application(queryBuilder, commandBuilder, game);
  }

  static async createGameInstance(gameRepository: GameRepository, idGenerator: IdGenerator): Promise<Game> {
    const snapshot = await gameRepository.load();
    if (snapshot) {
      const restoredGame = Game.restoreFromSnapshot(snapshot, idGenerator);
      if (restoredGame) return restoredGame;
    }
    return Game.create(idGenerator);
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

  get commands(): AppCommands {
    return this.commandBuilder.commands;
  }
}
