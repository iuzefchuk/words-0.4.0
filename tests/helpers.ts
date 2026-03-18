import { IdGenerator } from '@/shared/ports.ts';
import Board, { Axis } from '@/domain/models/Board.ts';
import type { CellIndex } from '@/domain/models/Board.ts';
import Inventory, { type TileId } from '@/domain/models/Inventory.ts';
import Dictionary from '@/domain/models/Dictionary.ts';
import TurnDirector from '@/application/TurnDirector.ts';
import { Player, Letter } from '@/domain/enums.ts';
import type { GameContext } from '@/application/types.ts';

export function tileId(value: string): TileId {
  return value as TileId;
}

export function cellIndex(value: number): CellIndex {
  return value as CellIndex;
}

export class TestIdGenerator implements IdGenerator {
  private counter = 0;

  execute(): string {
    this.counter++;
    return `test-id-${this.counter}`;
  }
}

export function createTestDictionary(words: ReadonlyArray<string>): Dictionary {
  const sorted = [...words].sort();
  // Build a trie manually and use the Dictionary's internal structure
  // We use the DictionaryTreeBuilder via Dictionary.create but with a custom word list
  // Since Dictionary.create() reads from DICTIONARY_DATA, we'll build one from scratch
  return buildDictionary(sorted);
}

type MutableNode = { id: number; isFinal: boolean; children: Map<Letter, MutableNode> };

function buildDictionary(sortedWords: ReadonlyArray<string>): Dictionary {
  let nodeId = 0;
  const rootNode: MutableNode = { id: nodeId++, isFinal: false, children: new Map() };
  const nodeById = new Map<number, MutableNode>();
  const allLetters = new Set<Letter>();

  for (const word of sortedWords) {
    let current = rootNode;
    for (const ch of word) {
      const letter = ch as Letter;
      allLetters.add(letter);
      let child = current.children.get(letter);
      if (!child) {
        child = { id: nodeId++, isFinal: false, children: new Map() };
        current.children.set(letter, child);
      }
      current = child;
    }
    current.isFinal = true;
  }

  function collectNodes(node: MutableNode): void {
    nodeById.set(node.id, node);
    Object.freeze(node.children);
    Object.freeze(node);
    for (const child of node.children.values()) collectNodes(child);
  }
  collectNodes(rootNode);

  // Use createFromCache to construct a real Dictionary instance
  const cache = { rootNode: rootNode as any, nodeById: nodeById as any, allLetters };
  const dict = Dictionary.createFromCache(cache);
  if (!dict) throw new Error('Failed to create test dictionary');
  return dict;
}

export function createTestContext(options?: {
  words?: ReadonlyArray<string>;
}): GameContext {
  const idGenerator = new TestIdGenerator();
  const players = [Player.User, Player.Opponent];
  const board = Board.create();
  const inventory = Inventory.create({ players, idGenerator });
  const turnDirector = TurnDirector.create({ players, board, idGenerator });
  const dictionary = createTestDictionary(options?.words ?? ['CAT', 'DOG', 'CAR', 'CARD', 'CATS', 'DO', 'AT']);
  return { board, inventory, turnDirector, dictionary };
}
