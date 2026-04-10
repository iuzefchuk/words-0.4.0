import CommandsService from '@/application/services/CommandsService.ts';
import QueriesService from '@/application/services/QueriesService.ts';
import { AppConfig, GameDictionary, GameLetter, GameSettings, GameTrie } from '@/application/types/index.ts';
import { CompressionService, IdentityService, SeedingService } from '@/application/types/ports.ts';
import { DictionaryRepository, EventRepository } from '@/application/types/repositories.ts';
import Game from '@/domain/Game.ts';
import { Node } from '@/domain/models/dictionary/types.ts';
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
    const game = await this.createGame(services, repositories, settings);
    const queriesService = new QueriesService(game);
    const commandsService = new CommandsService(game, services.scheduling, repositories.events);
    return new Application(commandsService, queriesService, game);
  }

  private static async createGame(
    services: { compression: CompressionService; identity: IdentityService; seeding: SeedingService },
    repositories: { dictionary: DictionaryRepository; events: EventRepository },
    settings: GameSettings,
  ): Promise<Game> {
    const dictionary = await this.fetchDictionary(services.compression, repositories.dictionary);
    const events = await repositories.events.load();
    return events && events.length > 0
      ? Game.createFromEvents(events, dictionary, services.identity, services.seeding)
      : Game.create(services.identity, services.seeding, dictionary, settings);
  }

  private static async fetchDictionary(compressor: CompressionService, repository: DictionaryRepository): Promise<GameDictionary> {
    const cachedTrie = await repository.load();
    if (cachedTrie) return GameDictionary.createFromTrie(cachedTrie);
    const data = await compressor.fetchAndDecompress('/dictionary.gz');
    const trie = this.parseSerializedTrie(data);
    const dictionary = GameDictionary.createFromTrie(trie);
    repository.save(dictionary.trie);
    return dictionary;
  }

  private static parseSerializedTrie(data: string): GameTrie {
    const parseNode = (arr: ReadonlyArray<unknown>): Node => {
      const isFinal = arr[0] === 1;
      const letters = arr[1] as string;
      const children = new Map<GameLetter, Node>();
      for (let i = 0; i < letters.length; i++) {
        children.set(letters[i] as GameLetter, parseNode(arr[i + 2] as ReadonlyArray<unknown>));
      }
      return { children, isFinal };
    };
    return parseNode(JSON.parse(data) as ReadonlyArray<unknown>);
  }
}
