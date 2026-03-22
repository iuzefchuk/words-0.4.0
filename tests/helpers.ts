import { IdGenerator } from '@/shared/ports.ts';
import Domain, { Dictionary, type GameContext, type GameCell, type GameTile, Player, Letter } from '@/domain/index.ts';
import TurnValidator from '@/domain/services/TurnValidator.ts';

export function tileId(value: string): GameTile {
  return value as GameTile;
}

export function cellIndex(value: number): GameCell {
  return value as GameCell;
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

export function findTileWithLetter(context: GameContext, player: Player, letter: Letter): GameTile | undefined {
  const tiles = context.inventory.getTilesFor(player);
  return tiles.find(tile => context.inventory.getTileLetter(tile) === letter);
}

export function placeAndValidate(
  context: GameContext,
  placements: ReadonlyArray<{ cell: GameCell; tile: GameTile }>,
): void {
  for (const { cell, tile } of placements) {
    context.game.placeTile({ cell, tile });
  }
  const tiles = context.game.currentTurnTiles;
  const result = TurnValidator.execute(context, tiles);
  context.game.setCurrentTurnValidation(result);
}

export function placeFirstTurn(
  context: GameContext,
  player: Player,
): { tiles: GameTile[]; cells: GameCell[] } {
  const playerTiles = context.inventory.getTilesFor(player);
  const tile1 = playerTiles[0];
  const tile2 = playerTiles[1];
  const cell1 = cellIndex(112); // center
  const cell2 = cellIndex(113); // right of center
  placeAndValidate(context, [
    { cell: cell1, tile: tile1 },
    { cell: cell2, tile: tile2 },
  ]);
  return { tiles: [tile1, tile2], cells: [cell1, cell2] };
}

export function createTestContext(options?: {
  words?: ReadonlyArray<string>;
}): GameContext {
  const idGenerator = new TestIdGenerator();
  const dictionary = createTestDictionary(options?.words ?? ['CAT', 'DOG', 'CAR', 'CARD', 'CATS', 'DO', 'AT']);
  const game = Domain.create({ dictionary, idGenerator });
  return game.context;
}
