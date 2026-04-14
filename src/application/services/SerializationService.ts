import { GameDictionary, GameTrie } from '@/application/types/index.ts';
import Board from '@/domain/models/board/Board.ts';
import Inventory from '@/domain/models/inventory/Inventory.ts';
import Turns from '@/domain/models/turns/Turns.ts';
import { GeneratorContext } from '@/domain/services/generation/turn/types.ts';

export default class SerializationService {
  hydrate(data: unknown): GeneratorContext {
    const d = data as { board: Board; dictionary: { trie: GameTrie }; inventory: Inventory; turns: Turns };
    return {
      board: Board.clone(d.board),
      dictionary: GameDictionary.createFromTrie(d.dictionary.trie),
      inventory: Inventory.clone(d.inventory),
      turns: Turns.clone(d.turns, { createUniqueId: () => '' }),
    };
  }
}
