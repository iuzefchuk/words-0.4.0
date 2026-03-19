import Game from '@/application/Game.ts';
import Board from '@/domain/models/Board.ts';
import { Player } from '@/domain/enums.ts';
import Inventory from '@/domain/models/Inventory.ts';
import TurnDirector from '@/application/services/TurnDirector.ts';
import TurnExecutor from '@/application/services/TurnExecutor.ts';
import IndexedDbDictionaryFactory from '@/infrastructure/IndexedDbDictionaryFactory.ts';
import IdGenerator from '@/infrastructure/CryptoIdGenerator.ts';
import DateApiClock from '@/infrastructure/DateApiClock.ts';
import Dictionary from '@/domain/models/Dictionary.ts';

export default class GameFactory {
  private static dictionary: Dictionary;

  static async create(): Promise<Game> {
    if (!GameFactory.dictionary) GameFactory.dictionary = await IndexedDbDictionaryFactory.create();
    const idGenerator = new IdGenerator();
    const clock = new DateApiClock();
    const players = Object.values(Player);
    const board = Board.create();
    const inventory = Inventory.create({ players, idGenerator });
    const turnDirector = TurnDirector.create({ board, idGenerator });
    const turnExecutor = new TurnExecutor();
    return Game.create({
      board,
      dictionary: GameFactory.dictionary,
      inventory,
      turnDirector,
      turnExecutor,
      clock,
    });
  }
}
